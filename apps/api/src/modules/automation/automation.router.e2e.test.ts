import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { DatajudClient } from '@ethica/datajud';
import {
  Case,
  CaseCourtSync,
  CourtProcess,
  CourtSyncDay,
  connect,
  dateInDisplayTz,
  disconnect,
  hashToken,
  Notification,
  Session,
  shiftMonth,
  Tenant,
  User,
} from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();

let counter = 0;
const seedSession = async (role: Role[] = ['operator'], office?: InstanceType<typeof Tenant>) => {
  counter += 1;
  const tenant =
    office ??
    (await Tenant.create({
      name: `Escritório ${counter}`,
      document: `7777777700${String(counter).padStart(4, '0')}`,
      status: 'active',
    }));
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `expert-${counter}@x.com`,
    Tenant: tenant._id,
    role,
  });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { tenant, user, as };
};

const NUMBER = '0024364-65.2020.5.24.0091';

describe('Automação Datajud: linha do tempo no tribunal (ADT-02, AD-276)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all(
      [CaseCourtSync, CourtProcess, CourtSyncDay, Notification, Case, Session, User, Tenant].map((model) =>
        (model as typeof Tenant).deleteMany({}),
      ),
    );
  });
  afterAll(async () => {
    await disconnect();
  });

  it('sem o módulo responde 403 automation_required; com ele traz os movimentos, do mais novo ao mais antigo', async () => {
    const { as, tenant } = await seedSession();
    const legalCase = (
      await as(request(app).post('/expert-cases')).send({
        processNumber: NUMBER,
        courtType: 'labor',
        serviceType: 'expert_examination',
        court: 'TRT24',
        subject: 'Insalubridade',
      })
    ).body.data;
    const path = `/automation/cases/${legalCase.id}/court-process`;

    const blocked = await as(request(app).get(path));
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe('automation_required');

    await Tenant.updateOne({ _id: tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    expect((await as(request(app).get(path))).body.data).toBeNull();

    await CourtProcess.create({
      court: 'TRT24',
      processNumber: NUMBER,
      degree: 'G1',
      className: 'Ação Trabalhista',
      fetchedAt: new Date(),
      movements: [
        { key: 'a', code: 26, name: 'Distribuição', at: new Date('2020-01-10T10:00:00Z'), complements: [] },
        { key: 'b', code: 60, name: 'Expedição de documento', at: new Date('2022-11-29T10:00:00Z'), complements: [] },
      ],
    });
    const timeline = (await as(request(app).get(path))).body.data;
    expect(timeline).toMatchObject({ court: 'TRT24', processNumber: NUMBER, className: 'Ação Trabalhista' });
    expect(timeline.movements.map((movement: { key: string }) => movement.key)).toEqual(['b', 'a']);

    const other = await seedSession();
    await Tenant.updateOne({ _id: other.tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    expect((await other.as(request(app).get(path))).status).toBe(404);
  });

  it('lista paginada de todo processo acompanhado com a situação, pela última movimentação (PAC-01, PAC-02, PAT-03)', async () => {
    const { as, tenant } = await seedSession();
    const create = async (processNumber: string) =>
      (
        await as(request(app).post('/expert-cases')).send({
          processNumber,
          courtType: 'labor',
          serviceType: 'expert_examination',
          court: 'TRT24',
          subject: 'Insalubridade',
        })
      ).body.data as { id: string };
    const synced = await create(NUMBER);
    const older = await create('0000013-00.2026.5.24.0001');
    const notFound = await create('0017068-93.2025.5.16.0008');
    const stale = await create('0000014-00.2026.5.24.0001');
    const waiting = await create('0000010-00.2026.5.24.0001');
    const closed = await create('0000011-00.2026.5.24.0001');
    const canceled = await create('0000012-00.2026.5.24.0001');
    await Case.updateOne({ _id: closed.id }, { phase: 'settlement' });
    await Case.updateOne({ _id: canceled.id }, { status: 'canceled' });
    const day = 86_400_000;
    const yesterday = new Date(Date.now() - day);
    const lastWeek = new Date(Date.now() - 7 * day);
    const sync = (legalCase: { id: string }, processNumber: string, extra: object) => ({
      Tenant: tenant._id,
      Case: legalCase.id,
      court: 'TRT24',
      processNumber,
      syncedAt: yesterday,
      ...extra,
    });
    await CaseCourtSync.create([
      sync(synced, NUMBER, {
        baselineAt: lastWeek,
        lastMovementAt: new Date('2026-11-20T10:00:00Z'),
        lastMovementName: 'Alvará',
      }),
      sync(older, '0000013-00.2026.5.24.0001', {
        baselineAt: lastWeek,
        lastMovementAt: new Date('2026-10-01T10:00:00Z'),
        lastMovementName: 'Conclusão',
      }),
      sync(notFound, '0017068-93.2025.5.16.0008', { court: 'TRT16' }),
      sync(stale, '0000014-00.2026.5.24.0001', { baselineAt: lastWeek, syncedAt: lastWeek }),
      sync(closed, '0000011-00.2026.5.24.0001', { baselineAt: lastWeek }),
    ]);

    expect((await as(request(app).get('/automation/cases'))).status).toBe(403);

    await Tenant.updateOne({ _id: tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    const list = (await as(request(app).get('/automation/cases'))).body.data;
    expect(list.total).toBe(5);
    // Newest movement first; without one, what needs a look (not found, stale) before the waiting one.
    expect(list.items.map((item: { caseId: string }) => item.caseId)).toEqual([
      synced.id,
      older.id,
      ...[notFound.id, stale.id].sort(),
      waiting.id,
    ]);
    expect(list.items[0]).toEqual({
      caseId: synced.id,
      caseLabel: NUMBER,
      court: 'TRT24',
      status: 'synced',
      syncedAt: yesterday.toISOString(),
      lastMovementAt: '2026-11-20T10:00:00.000Z',
      lastMovementName: 'Alvará',
    });
    expect(list.items.find((item: { caseId: string }) => item.caseId === stale.id).status).toBe('stale');
    expect(list.items.find((item: { caseId: string }) => item.caseId === notFound.id)).toMatchObject({
      court: 'TRT16',
      status: 'not_found',
    });

    const page = (await as(request(app).get('/automation/cases?limit=2&page=2'))).body.data;
    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(2);
    const filtered = (await as(request(app).get('/automation/cases?state=not_found&state=stale'))).body.data;
    expect(filtered.items.map((item: { status: string }) => item.status).sort()).toEqual(['not_found', 'stale']);
    const found = (await as(request(app).get('/automation/cases?q=0017068'))).body.data;
    expect(found.items.map((item: { caseId: string }) => item.caseId)).toEqual([notFound.id]);
    const byLabel = (await as(request(app).get('/automation/cases?sort=caseLabel&order=asc'))).body.data;
    expect(byLabel.items[0].caseLabel).toBe('0000010-00.2026.5.24.0001');
    expect((await as(request(app).get('/automation/cases?sort=nope'))).status).toBe(400);

    const other = await seedSession();
    await Tenant.updateOne({ _id: other.tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    expect((await other.as(request(app).get('/automation/cases'))).body.data).toEqual({ items: [], total: 0 });
  });

  describe('buscar no tribunal pelo número, na hora (SGD-06)', () => {
    const fetchProcesses = vi.fn<DatajudClient['fetchProcesses']>();
    const live = buildApp({ datajud: { fetchProcesses } });
    const lookup = (as: Awaited<ReturnType<typeof seedSession>>['as'], number = NUMBER) =>
      as(request(live).get(`/automation/court-lookup?processNumber=${number}`));
    const premium = async () => {
      const session = await seedSession();
      await Tenant.updateOne({ _id: session.tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
      return session;
    };

    it('sem o módulo, 403; com ele preenche pelo tribunal e guarda a cópia do dia', async () => {
      const { as, tenant } = await seedSession();
      expect((await lookup(as)).body.message).toBe('automation_required');
      await Tenant.updateOne({ _id: tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
      fetchProcesses.mockResolvedValueOnce([
        {
          court: 'TRT24',
          processNumber: NUMBER,
          degree: 'G1',
          courtUnitName: 'VARA DO TRABALHO DE BATAGUASSU',
          filedAt: '2020-03-02',
          subjects: ['Adicional de Insalubridade', 'Horas Extras'],
          movements: [],
        },
      ]);

      expect((await lookup(as)).body.data).toEqual({
        courtType: 'labor',
        court: 'TRT24',
        division: 'Vara do Trabalho de Bataguassu',
        docketingDate: '2020-03-02',
        subject: 'Adicional de Insalubridade, Horas Extras',
      });
      // The copy of the day answers the next lookups without calling the court again.
      expect((await lookup(as)).body.data.division).toBe('Vara do Trabalho de Bataguassu');
      expect(fetchProcesses).toHaveBeenCalledTimes(1);
      expect(await CourtProcess.countDocuments({ processNumber: NUMBER })).toBe(1);
    });

    it('não encontrado é 404; o tribunal fora do ar é 503; número fora do padrão é 400', async () => {
      const { as } = await premium();
      fetchProcesses.mockResolvedValueOnce([]);
      const missing = await lookup(as);
      expect([missing.status, missing.body.message]).toEqual([404, 'court_process_not_found']);

      fetchProcesses.mockRejectedValueOnce(new Error('TRT24 respondeu 429'));
      const down = await lookup(as);
      expect([down.status, down.body.message]).toEqual([503, 'court_unavailable']);

      expect((await lookup(as, '123')).status).toBe(400);
    });

    it('sem a chave do Datajud na API, 503', async () => {
      const { as } = await premium();
      const response = await as(
        request(buildApp({ datajud: null })).get(`/automation/court-lookup?processNumber=${NUMBER}`),
      );
      expect([response.status, response.body.message]).toEqual([503, 'court_unavailable']);
    });
  });

  it('painel (PAT-01, PAT-04, PAT-05): meses do registro diário e sugestões; dinheiro só para quem vê o Financeiro', async () => {
    const admin = await seedSession(['admin']);
    const operator = await seedSession(['operator'], admin.tenant);
    const blocked = await admin.as(request(app).get('/automation/dashboard'));
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe('automation_required');

    await Tenant.updateOne({ _id: admin.tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    const legalCase = (
      await admin.as(request(app).post('/expert-cases')).send({
        processNumber: NUMBER,
        courtType: 'labor',
        serviceType: 'expert_examination',
        court: 'TRT24',
        subject: 'Insalubridade',
      })
    ).body.data;
    const current = dateInDisplayTz(new Date()).slice(0, 7);
    const previous = shiftMonth(current, -1);
    await CourtSyncDay.create([
      {
        Tenant: admin.tenant._id,
        day: `${previous}-10`,
        tracked: 1,
        answeredCases: [legalCase.id],
        found: 1,
        newMovements: 3,
        notices: { expert_cases: 1, finance: 1 },
      },
      { Tenant: admin.tenant._id, day: `${previous}-11`, tracked: 1 },
    ]);
    const suggestion = (module: 'expert_cases' | 'finance', status: 'pending' | 'accepted') => ({
      Tenant: admin.tenant._id,
      kind: 'suggestion' as const,
      module,
      source: 'datajud' as const,
      status,
      Case: legalCase.id,
      proposal: { target: 'case_fill' as const, division: '1ª Vara' },
    });
    await Notification.create([
      suggestion('expert_cases', 'pending'),
      suggestion('expert_cases', 'accepted'),
      suggestion('finance', 'pending'),
    ]);

    const full = (await admin.as(request(app).get('/automation/dashboard'))).body.data;
    expect(full.byMonth).toHaveLength(25);
    expect(full.since).toBe(`${previous}-10`);
    expect(full.tracked).toEqual({ total: 1, byState: { synced: 0, not_found: 0, stale: 0, waiting: 1 } });
    expect(full.pending).toBe(2);
    expect(full.byMonth.at(-2)).toMatchObject({
      month: previous,
      movements: 3,
      notices: 2,
      roundDays: 2,
      completeDays: 1,
      suggestions: 0,
    });
    expect(full.byMonth.at(-1)).toMatchObject({
      month: current,
      suggestions: 3,
      byStatus: { pending: 2, accepted: 1 },
    });

    const partial = (await operator.as(request(app).get('/automation/dashboard'))).body.data;
    expect(partial.pending).toBe(1);
    expect(partial.byMonth.at(-2).notices).toBe(1);
    expect(partial.byMonth.at(-1)).toMatchObject({ suggestions: 2, byStatus: { pending: 1, accepted: 1 } });
  });
});
