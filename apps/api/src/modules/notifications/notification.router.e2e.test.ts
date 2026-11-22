import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import {
  Case,
  connect,
  dateInDisplayTz,
  disconnect,
  hashToken,
  Notification,
  Session,
  Tenant,
  Transaction,
  User,
} from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();

const day = (offset: number): string => {
  const date = new Date(`${dateInDisplayTz(new Date())}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

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

const CASE = {
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
};

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('Central de notificações: prazos e alertas (CNT-01, AD-263)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Notification.deleteMany({}),
      Transaction.deleteMany({}),
      Case.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  const setup = async (role: Role[] = ['operator']) => {
    const session = await seedSession(role);
    const add = async (caseId: string, body: object) =>
      (await session.as(request(app).post('/notifications')).send({ caseId, ...body })).body.data;
    const list = async (query = '') => (await session.as(request(app).get(`/notifications${query}`))).body.data;
    const patch = (id: string, body: object) => session.as(request(app).patch(`/notifications/${id}`)).send(body);
    const ofCase = async (caseId: string) => (await list(`?caseId=${caseId}`)).items;
    return { ...session, add, list, patch, ofCase };
  };

  it('pendentes por criticidade de todos os serviços; alerta só se conclui (AD-189)', async () => {
    const { as, add, list, patch } = await setup();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    const later = await add(legalCase.id, { title: 'Esclarecimentos', dueDate: day(10) });
    const overdue = await add(legalCase.id, { title: 'Manifestação', dueDate: day(-2) });
    const alert = await add(legalCase.id, { title: 'Ligar para o assistente', dueDate: day(1), kind: 'alert' });
    expect([later.kind, alert.kind]).toEqual(['deadline', 'alert']);
    expect(later).toMatchObject({ module: 'expert_cases', source: 'user', status: 'pending' });

    const pending = await list();
    expect(pending.total).toBe(3);
    expect(ids(pending.items)).toEqual([overdue.id, alert.id, later.id]);
    expect(pending.items[0]).toMatchObject({
      caseNumber: CASE.processNumber,
      role: CASE.role,
      courtType: CASE.courtType,
    });

    // Postponing moves it down the list.
    expect((await patch(overdue.id, { dueDate: day(20) })).body.data).toMatchObject({ dueDate: day(20) });
    expect(ids((await list()).items)).toEqual([alert.id, later.id, overdue.id]);
    expect((await patch(alert.id, { status: 'filed' })).status).toBe(422);
    expect((await patch(alert.id, { status: 'filed' })).body.message).toBe('invalid_notification_status');
    expect((await patch(later.id, { status: 'done' })).status).toBe(422);
    expect((await patch(later.id, { status: 'accepted' })).status).toBe(422);
    expect((await patch(alert.id, { status: 'done' })).body.data).toMatchObject({ status: 'done' });
    expect(ids((await list('?status=done')).items)).toEqual([alert.id]);
    expect((await list()).total).toBe(2);
    expect((await as(request(app).get('/notifications?status=x'))).status).toBe(400);
  });

  it('prazo e alerta pendentes podem ser cancelados e saem dos pendentes (D1)', async () => {
    const { as, add, list, patch } = await setup();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    const deadline = await add(legalCase.id, { title: 'Esclarecimentos', dueDate: day(3) });
    const alert = await add(legalCase.id, { title: 'Lembrar', dueDate: day(4), kind: 'alert' });

    expect((await patch(deadline.id, { status: 'canceled' })).body.data).toMatchObject({ status: 'canceled' });
    expect((await patch(alert.id, { status: 'canceled' })).body.data).toMatchObject({ status: 'canceled' });
    expect((await list()).total).toBe(0);
    expect(ids((await list('?status=canceled')).items).sort()).toEqual([deadline.id, alert.id].sort());
  });

  it('a lista traz o contratante e o tipo do serviço do escritório', async () => {
    const { as, add, list } = await setup();
    const legalCase = (
      await as(request(app).post('/expert-cases')).send({
        serviceType: 'Avaliação de imóvel',
        role: 'technical_assistant',
        subject: 'Avaliação de imóvel',
        contractor: { name: 'Construtora Alfa' },
      })
    ).body.data;
    await add(legalCase.id, { title: 'Entrega', dueDate: day(3) });

    const { items } = await list();
    expect(items[0]).toMatchObject({ client: 'Construtora Alfa', serviceType: 'Avaliação de imóvel' });
  });

  it('cadastrar o serviço com prazo do laudo cria "Entrega do laudo" pendente pelo evento (AD-264)', async () => {
    const { as, ofCase } = await setup();
    const created = await as(request(app).post('/expert-cases')).send({ ...CASE, reportDueDate: day(20) });
    expect(created.status).toBe(201);
    expect(created.body.data).not.toHaveProperty('reportDueDate');

    await expect
      .poll(() => ofCase(created.body.data.id))
      .toEqual([
        expect.objectContaining({ title: 'Entrega do laudo', dueDate: day(20), status: 'pending', source: 'system' }),
      ]);
  });

  it('cria pendente, protocola com data, marca perdido e reabre (AC 1–3)', async () => {
    const { as, ofCase } = await setup();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;

    const created = await as(request(app).post('/notifications')).send({
      caseId: legalCase.id,
      title: 'Esclarecimentos',
      dueDate: day(-3),
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'pending', dueDate: day(-3), caseId: legalCase.id });
    const id = created.body.data.id;

    const filed = await as(request(app).patch(`/notifications/${id}`)).send({ status: 'filed', filedDate: day(-4) });
    expect(filed.body.data).toMatchObject({ status: 'filed', filedDate: day(-4) });

    const semData = await as(request(app).patch(`/notifications/${id}`)).send({ status: 'filed' });
    expect(semData.body.data.filedDate).toBe(day(0));

    const missed = await as(request(app).patch(`/notifications/${id}`)).send({ status: 'missed' });
    expect(missed.body.data.status).toBe('missed');
    expect(missed.body.data).not.toHaveProperty('filedDate');

    const [listed] = await ofCase(legalCase.id);
    expect(listed.status).toBe('missed');
  });

  it('listagem mostra o próximo prazo pendente e a faixa conta vencidos e os que vencem em até 15 dias (AC 5)', async () => {
    const { as, add } = await setup();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    for (const [title, dueDate] of [
      ['Vencido', day(-1)],
      ['Em breve', day(15)],
      ['Longe', day(16)],
    ] as const) {
      await add(legalCase.id, { title, dueDate });
    }

    const list = await as(request(app).get('/expert-cases'));
    expect(list.body.data.items[0].nextDue).toEqual({ title: 'Vencido', dueDate: day(-1) });

    const stats = await as(request(app).get('/expert-cases/stats'));
    const groups = Object.fromEntries(
      stats.body.data.groups.map((g: { key: string; count: number }) => [g.key, g.count]),
    );
    expect(groups).toMatchObject({ overdue_deadlines: 1, deadlines_due_soon: 1 });
  });

  it('a agenda recebe os prazos do intervalo por evento, com o número do processo (AC 6, AD-169)', async () => {
    const { as, add } = await setup();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    await add(legalCase.id, { title: 'Dentro', dueDate: day(2) });
    await add(legalCase.id, { title: 'Fora', dueDate: day(40) });

    const entries = async () => (await as(request(app).get(`/agenda/entries?from=${day(0)}&to=${day(7)}`))).body.data;
    await expect
      .poll(entries)
      .toEqual([expect.objectContaining({ type: 'deadline', title: 'Dentro', caseNumber: CASE.processNumber })]);
  });

  it('excluir o serviço exclui as notificações; notificação de outro tenant é 404', async () => {
    const admin = await setup(['admin']);
    const other = await setup();
    const legalCase = (await admin.as(request(app).post('/expert-cases')).send({ ...CASE, reportDueDate: day(5) })).body
      .data;
    await expect.poll(async () => (await admin.ofCase(legalCase.id)).length).toBe(1);
    const [deadline] = await admin.ofCase(legalCase.id);

    expect((await other.patch(deadline.id, { status: 'missed' })).status).toBe(404);
    expect(
      (await other.as(request(app).post('/notifications')).send({ caseId: legalCase.id, title: 'X', dueDate: day(1) }))
        .status,
    ).toBe(404);
    expect((await other.as(request(app).get(`/notifications?caseId=${legalCase.id}`))).status).toBe(404);

    expect((await admin.as(request(app).delete(`/expert-cases/${legalCase.id}`))).status).toBe(200);
    await expect.poll(() => Notification.countDocuments({ Case: legalCase.id })).toBe(0);
  });

  it('avisos: quem não vê o financeiro não vê finance_due; lido é por pessoa (CNT-04, D5)', async () => {
    const admin = await setup(['admin']);
    const operator = await seedSession(['operator']);
    await User.updateOne({ _id: operator.user._id }, { Tenant: admin.tenant._id });
    const notice = (module: 'finance' | 'expert_cases', key: string) =>
      Notification.create({
        Tenant: admin.tenant._id,
        kind: 'notice',
        module,
        source: 'system',
        topic: 'finance_due',
        params: { bucket: 'overdue', description: key, dueDate: day(-1), openCents: 100 },
        dedupeKey: key,
      });
    await notice('finance', 'f1');
    await notice('expert_cases', 'c1');

    const count = async (as: typeof admin.as) =>
      (await as(request(app).get('/notifications/unread-count'))).body.data.count;
    expect(await count(admin.as)).toBe(2);
    expect(await count(operator.as)).toBe(1);
    const opList = (await operator.as(request(app).get('/notifications/notices'))).body.data;
    expect(opList.items.map((item: { module: string }) => item.module)).toEqual(['expert_cases']);

    const [first] = (await admin.as(request(app).get('/notifications/notices?unread=true'))).body.data.items;
    expect((await admin.as(request(app).post(`/notifications/${first.id}/read`))).status).toBe(200);
    expect(await count(admin.as)).toBe(1);
    // Reading is per person: the operator still has it unread.
    expect(await count(operator.as)).toBe(1);
    // The operator cannot mark the finance one.
    const finance = await Notification.findOne({ module: 'finance' }).lean();
    expect((await operator.as(request(app).post(`/notifications/${finance?._id}/read`))).status).toBe(404);

    expect((await admin.as(request(app).post('/notifications/read-all'))).status).toBe(200);
    expect(await count(admin.as)).toBe(0);
    expect(
      (await admin.as(request(app).get('/notifications/notices'))).body.data.items.every(
        (item: { read: boolean }) => item.read,
      ),
    ).toBe(true);
  });

  it('sugestões (AD-268): aprovar aplica pelo serviço uma vez só; já aplicada é superada; fora de ordem 409; rejeitar guarda o motivo', async () => {
    const { as, tenant } = await setup(['admin']);
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    const suggestion = (proposal: object, key: string) =>
      Notification.create({
        Tenant: tenant._id,
        Case: legalCase.id,
        kind: 'suggestion',
        module: 'expert_cases',
        source: 'datajud',
        status: 'pending',
        proposal,
        evidence: {
          court: 'TRT2',
          movement: { key, code: 466, name: 'Homologação de Transação', at: '2026-11-20T10:00:00Z', complements: [] },
        },
        ruleKey: 'case_settlement',
        ruleVersion: 1,
        dedupeKey: key,
      });
    const settlement = await suggestion({ target: 'case_phase', value: 'settlement' }, 's1');
    const accept = (id: unknown) => as(request(app).post(`/notifications/${id}/accept`)).send({});

    const blocked = await accept(settlement._id);
    expect([blocked.status, blocked.body.message]).toEqual([403, 'automation_required']);
    await Tenant.updateOne({ _id: tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });

    const listed = (await as(request(app).get(`/notifications/suggestions?caseId=${legalCase.id}`))).body.data;
    expect(listed).toEqual([expect.objectContaining({ ruleKey: 'case_settlement', caseNumber: CASE.processNumber })]);

    expect((await accept(settlement._id)).body.data).toMatchObject({ status: 'accepted' });
    expect((await as(request(app).get(`/expert-cases/${legalCase.id}`))).body.data.phase).toBe('settlement');
    expect((await accept(settlement._id)).status).toBe(404);

    // The case is closed now: a phase suggestion no longer fits.
    const late = await suggestion({ target: 'case_phase', value: 'evidence_closed' }, 's2');
    const outdated = await accept(late._id);
    expect([outdated.status, outdated.body.message]).toEqual([409, 'suggestion_outdated']);

    const again = await suggestion({ target: 'case_phase', value: 'settlement' }, 's3');
    expect((await accept(again._id)).body.data).toMatchObject({ status: 'superseded' });

    const rejected = await as(request(app).post(`/notifications/${late._id}/reject`)).send({
      reason: 'Era de outro processo',
    });
    expect(rejected.body.data).toMatchObject({ status: 'rejected', rejectReason: 'Era de outro processo' });
  });

  it('recebimento do alvará (AD-269): exige lançamento, valor e data; acima do saldo recusa e volta a pendente; acordo oferece cancelar os prazos', async () => {
    const { as, tenant, add } = await setup(['admin']);
    await Tenant.updateOne({ _id: tenant._id }, { automationUntil: new Date(Date.now() + 86_400_000) });
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    const income = await Transaction.create({
      Tenant: tenant._id,
      Case: legalCase.id,
      kind: 'income',
      category: 'fixed_fees',
      description: 'Honorários',
      amountCents: 300_000,
      dueDate: day(10),
      status: 'expected',
    });
    const evidence = {
      court: 'TRT2',
      movement: {
        key: 'p',
        code: 60,
        name: 'Expedição de documento',
        at: '2026-11-21T10:00:00Z',
        complements: [{ code: 4, value: 73, name: 'Alvará' }],
      },
    };
    const receipt = await Notification.create({
      Tenant: tenant._id,
      Case: legalCase.id,
      kind: 'suggestion',
      module: 'finance',
      source: 'datajud',
      status: 'pending',
      proposal: { target: 'transaction_installment', date: '2026-11-21' },
      evidence,
      ruleKey: 'payment_available',
      ruleVersion: 1,
      dedupeKey: 'receipt',
    });
    const accept = (id: unknown, body: object = {}) => as(request(app).post(`/notifications/${id}/accept`)).send(body);

    expect((await accept(receipt._id)).status).toBe(422);
    const tooMuch = await accept(receipt._id, { transactionId: income.id, amountCents: 900_000, date: '2026-11-21' });
    expect([tooMuch.status, tooMuch.body.message]).toEqual([422, 'parcel_exceeds_balance']);
    expect((await Notification.findById(receipt._id).lean())?.status).toBe('pending');
    const ok = await accept(receipt._id, {
      transactionId: income.id,
      amountCents: 100_000,
      date: '2026-11-21',
      account: 'Banco do Brasil',
    });
    expect(ok.body.data).toMatchObject({ status: 'accepted' });
    expect((await Transaction.findById(income._id).lean())?.status).toBe('partial');

    await add(legalCase.id, { title: 'Esclarecimentos', dueDate: day(5) });
    const settlement = await Notification.create({
      Tenant: tenant._id,
      Case: legalCase.id,
      kind: 'suggestion',
      module: 'expert_cases',
      source: 'datajud',
      status: 'pending',
      proposal: { target: 'case_phase', value: 'settlement' },
      evidence,
      ruleKey: 'case_settlement',
      ruleVersion: 1,
      dedupeKey: 'settlement',
    });
    await accept(settlement._id);
    const cancel = await Notification.findOne({ ruleKey: 'notifications_cancel' }).lean();
    expect(cancel).toMatchObject({ status: 'pending', proposal: { target: 'notifications_cancel', count: 1 } });
    expect((await accept(cancel?._id)).body.data).toMatchObject({ status: 'accepted' });
    expect(await Notification.countDocuments({ kind: 'deadline', status: 'canceled' })).toBe(1);
  });
});
