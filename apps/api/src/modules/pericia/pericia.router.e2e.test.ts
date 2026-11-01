import crypto from 'node:crypto';
import type { Permissoes, Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import { connect, disconnect, hashToken, Lancamento, Parte, Pericia, Prazo, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp({ storage: null });

let counter = 0;
const seedTenant = async () => {
  counter += 1;
  return Tenant.create({
    name: `Escritório ${counter}`,
    document: `6666666600${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[], permissoes?: Permissoes) => {
  counter += 1;
  const user = await User.create({
    name: `Pessoa ${counter}`,
    email: `pericia-${counter}@x.com`,
    password: 'hash',
    Tenant: tenantId,
    role,
    permissoes,
  });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { user, as };
};

const PERICIA = {
  numeroProcesso: '0001234-56.2026.5.02.0001',
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT2',
  objeto: 'Insalubridade',
} as const;

describe('perícias — matriz, fase, contratante e paradas (GES-02/03/05/06)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Lancamento.deleteMany({}),
      Prazo.deleteMany({}),
      Parte.deleteMany({}),
      Pericia.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('a matriz do membro decide cada ação, antes de tocar dados (AD-137)', async () => {
    const tenant = await seedTenant();
    const secretaria = await seedSession(tenant._id, ['operator'], {
      expert_cases: ['view'],
      finance: ['view', 'create', 'update'],
    });

    expect((await secretaria.as(request(app).get('/expert-cases'))).status).toBe(200);
    expect((await secretaria.as(request(app).post('/expert-cases')).send(PERICIA)).status).toBe(403);
    expect(await Pericia.countDocuments()).toBe(0);
    expect((await secretaria.as(request(app).get('/finance/summary'))).status).toBe(200);
    expect((await secretaria.as(request(app).get('/agenda'))).status).toBe(403);

    const operador = await seedSession(tenant._id, ['operator']);
    expect((await operador.as(request(app).get('/finance/summary'))).status).toBe(403);
    expect((await operador.as(request(app).post('/expert-cases')).send(PERICIA)).status).toBe(201);
  });

  it('fase ajusta a etapa, suspensão muda a situação e a listagem filtra (AD-133)', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['admin']);
    const { body } = await as(request(app).post('/expert-cases')).send(PERICIA);
    const id = body.data.id as string;

    const revisao = await as(request(app).patch(`/expert-cases/${id}`)).send({ fase: 'reviewing_report' });
    expect(revisao.body.data).toMatchObject({
      status: 'drafting_report',
      fase: 'reviewing_report',
      situacao: 'active',
    });

    const incoerente = await as(request(app).patch(`/expert-cases/${id}`)).send({
      status: 'completed',
      fase: 'reviewing_report',
    });
    expect(incoerente.status).toBe(422);

    const acordo = await as(request(app).patch(`/expert-cases/${id}`)).send({ fase: 'settlement' });
    expect(acordo.body.data).toMatchObject({ status: 'drafting_report', situacao: 'suspended' });

    const suspensas = await as(request(app).get('/expert-cases?situacao=suspended'));
    expect(suspensas.body.data.items.map((item: { id: string }) => item.id)).toEqual([id]);
    expect((await as(request(app).get('/expert-cases?situacao=active'))).body.data.total).toBe(0);

    const encerrada = await as(request(app).patch(`/expert-cases/${id}`)).send({ status: 'completed' });
    expect(encerrada.body.data).toMatchObject({ situacao: 'closed' });
    expect(encerrada.body.data.fase).toBeUndefined();
  });

  it('honorário contratado do assistente técnico vira receita com o contratante (AD-135)', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['admin']);
    const { body } = await as(request(app).post('/expert-cases')).send({
      ...PERICIA,
      papel: 'technical_assistant',
      partes: [
        { polo: 'plaintiff', tipo: 'party', nome: 'Maria Reclamante', contratante: true },
        { polo: 'defendant', tipo: 'party', nome: 'Empresa Ré' },
      ],
    });
    expect(body.data.partes[0]).toMatchObject({ nome: 'Maria Reclamante', contratante: true });

    await as(request(app).patch(`/expert-cases/${body.data.id}`)).send({ honorariosFixadosCents: 300_000 });
    await expect
      .poll(async () => (await as(request(app).get('/finance/entries'))).body.data?.items?.[0])
      .toMatchObject({ categoria: 'contracted_fees', valorCents: 300_000, contratante: 'Maria Reclamante' });

    const perito = await as(request(app).post('/expert-cases')).send({
      ...PERICIA,
      numeroProcesso: '0001234-56.2026.5.02.0002',
      partes: [{ polo: 'plaintiff', tipo: 'party', nome: 'Outra', contratante: true }],
    });
    expect(perito.status).toBe(422);
  });

  it('paradas do início: total e as mais antigas, sem as suspensas (GES-05)', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['operator']);
    await Pericia.create([
      { ...PERICIA, Tenant: tenant._id, dataNomeacao: '2020-01-10' },
      {
        ...PERICIA,
        Tenant: tenant._id,
        numeroProcesso: '0001234-56.2026.5.02.0003',
        dataNomeacao: '2020-01-10',
        fase: 'withdrawal' as const,
      },
    ]);
    const res = await as(request(app).get('/expert-cases/stalled'));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0]).toMatchObject({ numeroProcesso: PERICIA.numeroProcesso });
  });
});
