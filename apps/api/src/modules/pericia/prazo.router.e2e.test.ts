import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, dateInDisplayTz, disconnect, hashToken, Pericia, Prazo, Session, Tenant, User } from '@ethica/db';
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
    email: `perito-${counter}@x.com`,
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

const PERICIA = {
  numeroProcesso: '0001234-56.2026.5.02.0001',
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT2',
  objeto: 'Insalubridade',
};

describe('prazos da perícia (PRZ-01)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Prazo.deleteMany({}),
      Pericia.deleteMany({}),
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
    const created = await as(request(app).post('/expert-cases')).send({ ...PERICIA, prazoLaudo: day(20) });
    expect(created.status).toBe(201);
    expect(created.body.data).not.toHaveProperty('prazoLaudo');

    const prazos = await as(request(app).get(`/expert-cases/${created.body.data.id}/deadlines`));
    expect(prazos.status).toBe(200);
    expect(prazos.body.data).toEqual([
      expect.objectContaining({ titulo: 'Entrega do laudo', vencimento: day(20), status: 'pending' }),
    ]);
  });

  it('cria pendente, protocola com data, marca perdido e reabre (AC 1–3)', async () => {
    const { as } = await seedSession();
    const pericia = (await as(request(app).post('/expert-cases')).send(PERICIA)).body.data;

    const criado = await as(request(app).post(`/expert-cases/${pericia.id}/deadlines`)).send({
      titulo: 'Esclarecimentos',
      vencimento: day(-3),
    });
    expect(criado.status).toBe(201);
    expect(criado.body.data).toMatchObject({ status: 'pending', vencimento: day(-3), periciaId: pericia.id });
    const id = criado.body.data.id;

    const protocolado = await as(request(app).patch(`/expert-cases/deadlines/${id}`)).send({
      status: 'filed',
      protocoladoEm: day(-4),
    });
    expect(protocolado.body.data).toMatchObject({ status: 'filed', protocoladoEm: day(-4) });

    const semData = await as(request(app).patch(`/expert-cases/deadlines/${id}`)).send({ status: 'filed' });
    expect(semData.body.data.protocoladoEm).toBe(day(0));

    const perdido = await as(request(app).patch(`/expert-cases/deadlines/${id}`)).send({ status: 'missed' });
    expect(perdido.body.data.status).toBe('missed');
    expect(perdido.body.data).not.toHaveProperty('protocoladoEm');

    const pendentes = await as(request(app).get('/expert-cases/deadlines'));
    expect(pendentes.body.data).toEqual([]);
  });

  it('listagem mostra o próximo prazo pendente e a faixa conta vencidos e os que vencem em até 15 dias (AC 5)', async () => {
    const { as } = await seedSession();
    const pericia = (await as(request(app).post('/expert-cases')).send(PERICIA)).body.data;
    for (const [titulo, vencimento] of [
      ['Vencido', day(-1)],
      ['Em breve', day(15)],
      ['Longe', day(16)],
    ] as const) {
      await as(request(app).post(`/expert-cases/${pericia.id}/deadlines`)).send({ titulo, vencimento });
    }

    const lista = await as(request(app).get('/expert-cases'));
    expect(lista.body.data.items[0].proximoPrazo).toEqual({ titulo: 'Vencido', vencimento: day(-1) });

    const stats = await as(request(app).get('/expert-cases/stats'));
    const groups = Object.fromEntries(
      stats.body.data.groups.map((g: { key: string; count: number }) => [g.key, g.count]),
    );
    expect(groups).toMatchObject({ overdue_deadlines: 1, deadlines_due_soon: 1 });
  });

  it('calendário recebe só os pendentes do intervalo, com o número do processo (AC 6)', async () => {
    const { as } = await seedSession();
    const pericia = (await as(request(app).post('/expert-cases')).send(PERICIA)).body.data;
    await as(request(app).post(`/expert-cases/${pericia.id}/deadlines`)).send({ titulo: 'Dentro', vencimento: day(2) });
    await as(request(app).post(`/expert-cases/${pericia.id}/deadlines`)).send({ titulo: 'Fora', vencimento: day(40) });

    const res = await as(request(app).get(`/expert-cases/deadlines?from=${day(0)}&to=${day(7)}`));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ titulo: 'Dentro', periciaNumero: PERICIA.numeroProcesso }),
    ]);
  });

  it('excluir a perícia exclui os prazos; prazo de outro tenant é 404', async () => {
    const admin = await seedSession(['admin']);
    const outro = await seedSession();
    const pericia = (await admin.as(request(app).post('/expert-cases')).send({ ...PERICIA, prazoLaudo: day(5) })).body
      .data;
    const [prazo] = (await admin.as(request(app).get(`/expert-cases/${pericia.id}/deadlines`))).body.data;

    expect(
      (await outro.as(request(app).patch(`/expert-cases/deadlines/${prazo.id}`)).send({ status: 'missed' })).status,
    ).toBe(404);
    expect(
      (
        await outro
          .as(request(app).post(`/expert-cases/${pericia.id}/deadlines`))
          .send({ titulo: 'X', vencimento: day(1) })
      ).status,
    ).toBe(404);

    expect((await admin.as(request(app).delete(`/expert-cases/${pericia.id}`))).status).toBe(200);
    expect(await Prazo.countDocuments({ Pericia: pericia.id })).toBe(0);
  });
});
