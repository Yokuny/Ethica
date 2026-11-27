import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { Case, CaseCourtSync, CourtProcess, connect, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();

let counter = 0;
const seedSession = async (role: Role[] = ['operator']) => {
  counter += 1;
  const tenant = await Tenant.create({
    name: `Escritório ${counter}`,
    document: `7777777700${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
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
      [CaseCourtSync, CourtProcess, Case, Session, User, Tenant].map((model) =>
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
        role: 'court_expert',
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

  it('lista todo processo acompanhado com a situação; encerrado e cancelado ficam fora (PAC-01, PAC-02)', async () => {
    const { as, tenant } = await seedSession();
    const create = async (processNumber: string) =>
      (
        await as(request(app).post('/expert-cases')).send({
          processNumber,
          courtType: 'labor',
          role: 'court_expert',
          court: 'TRT24',
          subject: 'Insalubridade',
        })
      ).body.data as { id: string };
    const synced = await create(NUMBER);
    const notFound = await create('0017068-93.2025.5.16.0008');
    const waiting = await create('0000010-00.2026.5.24.0001');
    const closed = await create('0000011-00.2026.5.24.0001');
    const canceled = await create('0000012-00.2026.5.24.0001');
    await Case.updateOne({ _id: closed.id }, { phase: 'settlement' });
    await Case.updateOne({ _id: canceled.id }, { status: 'canceled' });
    const syncedAt = new Date('2026-11-20T06:00:00Z');
    const queriedAt = new Date('2026-11-23T06:00:00Z');
    await CaseCourtSync.create([
      { Tenant: tenant._id, Case: synced.id, court: 'TRT24', processNumber: NUMBER, baselineAt: syncedAt, syncedAt },
      {
        Tenant: tenant._id,
        Case: notFound.id,
        court: 'TRT16',
        processNumber: '0017068-93.2025.5.16.0008',
        syncedAt: queriedAt,
      },
      {
        Tenant: tenant._id,
        Case: closed.id,
        court: 'TRT24',
        processNumber: '0000011-00.2026.5.24.0001',
        baselineAt: syncedAt,
        syncedAt,
      },
    ]);

    expect((await as(request(app).get('/automation/cases'))).status).toBe(403);

    await Tenant.updateOne({ _id: tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    const list = (await as(request(app).get('/automation/cases'))).body.data as { caseId: string }[];
    expect(list.sort((a, b) => a.caseId.localeCompare(b.caseId))).toEqual(
      [
        { caseId: synced.id, caseLabel: NUMBER, court: 'TRT24', status: 'synced', syncedAt: syncedAt.toISOString() },
        {
          caseId: notFound.id,
          caseLabel: '0017068-93.2025.5.16.0008',
          court: 'TRT16',
          status: 'not_found',
          syncedAt: queriedAt.toISOString(),
        },
        { caseId: waiting.id, caseLabel: '0000010-00.2026.5.24.0001', court: 'TRT24', status: 'waiting' },
      ].sort((a, b) => a.caseId.localeCompare(b.caseId)),
    );

    const other = await seedSession();
    await Tenant.updateOne({ _id: other.tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    expect((await other.as(request(app).get('/automation/cases'))).body.data).toEqual([]);
  });
});
