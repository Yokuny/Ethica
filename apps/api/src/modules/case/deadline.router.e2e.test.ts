import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { Case, connect, Deadline, dateInDisplayTz, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
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
    password: 'hash',
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

describe('prazos da perícia (PRZ-01)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Deadline.deleteMany({}),
      Case.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('cadastrar a perícia com prazo do laudo cria "Entrega do laudo" pendente; a perícia não guarda o campo', async () => {
    const { as } = await seedSession();
    const created = await as(request(app).post('/expert-cases')).send({ ...CASE, reportDeadline: day(20) });
    expect(created.status).toBe(201);
    expect(created.body.data).not.toHaveProperty('reportDeadline');

    const deadlines = await as(request(app).get(`/expert-cases/${created.body.data.id}/deadlines`));
    expect(deadlines.status).toBe(200);
    expect(deadlines.body.data).toEqual([
      expect.objectContaining({ title: 'Entrega do laudo', dueDate: day(20), status: 'pending' }),
    ]);
  });

  it('cria pendente, protocola com data, marca perdido e reabre (AC 1–3)', async () => {
    const { as } = await seedSession();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;

    const created = await as(request(app).post(`/expert-cases/${legalCase.id}/deadlines`)).send({
      title: 'Esclarecimentos',
      dueDate: day(-3),
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'pending', dueDate: day(-3), caseId: legalCase.id });
    const id = created.body.data.id;

    const filed = await as(request(app).patch(`/expert-cases/deadlines/${id}`)).send({
      status: 'filed',
      filedDate: day(-4),
    });
    expect(filed.body.data).toMatchObject({ status: 'filed', filedDate: day(-4) });

    const semData = await as(request(app).patch(`/expert-cases/deadlines/${id}`)).send({ status: 'filed' });
    expect(semData.body.data.filedDate).toBe(day(0));

    const missed = await as(request(app).patch(`/expert-cases/deadlines/${id}`)).send({ status: 'missed' });
    expect(missed.body.data.status).toBe('missed');
    expect(missed.body.data).not.toHaveProperty('filedDate');

    const pending = await as(request(app).get('/expert-cases/deadlines'));
    expect(pending.body.data).toEqual([]);
  });

  it('listagem mostra o próximo prazo pendente e a faixa conta vencidos e os que vencem em até 15 dias (AC 5)', async () => {
    const { as } = await seedSession();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    for (const [title, dueDate] of [
      ['Vencido', day(-1)],
      ['Em breve', day(15)],
      ['Longe', day(16)],
    ] as const) {
      await as(request(app).post(`/expert-cases/${legalCase.id}/deadlines`)).send({ title, dueDate });
    }

    const list = await as(request(app).get('/expert-cases'));
    expect(list.body.data.items[0].nextDeadline).toEqual({ title: 'Vencido', dueDate: day(-1) });

    const stats = await as(request(app).get('/expert-cases/stats'));
    const groups = Object.fromEntries(
      stats.body.data.groups.map((g: { key: string; count: number }) => [g.key, g.count]),
    );
    expect(groups).toMatchObject({ overdue_deadlines: 1, deadlines_due_soon: 1 });
  });

  it('calendário recebe só os pendentes do intervalo, com o número do processo (AC 6)', async () => {
    const { as } = await seedSession();
    const legalCase = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    await as(request(app).post(`/expert-cases/${legalCase.id}/deadlines`)).send({
      title: 'Dentro',
      dueDate: day(2),
    });
    await as(request(app).post(`/expert-cases/${legalCase.id}/deadlines`)).send({
      title: 'Fora',
      dueDate: day(40),
    });

    const res = await as(request(app).get(`/expert-cases/deadlines?from=${day(0)}&to=${day(7)}`));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ title: 'Dentro', caseNumber: CASE.processNumber })]);
  });

  it('excluir a perícia exclui os prazos; prazo de outro tenant é 404', async () => {
    const admin = await seedSession(['admin']);
    const other = await seedSession();
    const legalCase = (await admin.as(request(app).post('/expert-cases')).send({ ...CASE, reportDeadline: day(5) }))
      .body.data;
    const [deadline] = (await admin.as(request(app).get(`/expert-cases/${legalCase.id}/deadlines`))).body.data;

    expect(
      (await other.as(request(app).patch(`/expert-cases/deadlines/${deadline.id}`)).send({ status: 'missed' })).status,
    ).toBe(404);
    expect(
      (
        await other
          .as(request(app).post(`/expert-cases/${legalCase.id}/deadlines`))
          .send({ title: 'X', dueDate: day(1) })
      ).status,
    ).toBe(404);

    expect((await admin.as(request(app).delete(`/expert-cases/${legalCase.id}`))).status).toBe(200);
    expect(await Deadline.countDocuments({ Case: legalCase.id })).toBe(0);
  });
});
