import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import { Atividade, connect, disconnect, hashToken, Pericia, Session, Tenant, User } from '@ethica/db';
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
    document: `7777777700${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[]) => {
  counter += 1;
  const user = await User.create({
    name: `Pessoa ${counter}`,
    email: `diario-${counter}@x.com`,
    password: 'hash',
    Tenant: tenantId,
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
  return { user, as };
};

describe('diário de bordo (GES-01, AD-134)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Atividade.deleteMany({}),
      Pericia.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('grava a escrita do operador e só o admin consulta, com filtros', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operador = await seedSession(tenant._id, ['operator']);

    const criada = await operador.as(request(app).post('/pericias')).send({
      numeroProcesso: '0001234-56.2026.5.02.0001',
      justica: 'labor',
      papel: 'court_expert',
      tribunal: 'TRT2',
      objeto: 'Insalubridade',
    });
    expect(criada.status).toBe(201);
    // Leitura não entra no diário.
    await operador.as(request(app).get('/pericias'));

    await expect.poll(async () => (await admin.as(request(app).get('/tenant/diario'))).body.data?.total).toBe(1);
    const res = await admin.as(request(app).get(`/tenant/diario?modulo=pericias&userId=${operador.user.id}`));
    expect(res.body.data.items[0]).toMatchObject({
      userName: operador.user.name,
      modulo: 'pericias',
      acao: 'create',
      registroId: criada.body.data.id,
      rotulo: '0001234-56.2026.5.02.0001',
    });

    const vazio = await admin.as(request(app).get('/tenant/diario?acao=delete'));
    expect(vazio.body.data.total).toBe(0);

    const negado = await operador.as(request(app).get('/tenant/diario'));
    expect(negado.status).toBe(403);
  });

  it('não grava ação recusada nem mistura escritórios', async () => {
    const tenant = await seedTenant();
    const outro = await seedTenant();
    const operador = await seedSession(tenant._id, ['operator']);
    const adminOutro = await seedSession(outro._id, ['admin']);

    const recusada = await operador.as(request(app).delete('/pericias/6650f1a2b3c4d5e6f7a8b9c0'));
    expect(recusada.status).toBe(403);
    await operador.as(request(app).patch('/me/profile')).send({ name: 'Nome Novo' });

    await expect.poll(async () => Atividade.countDocuments({ Tenant: tenant._id })).toBe(1);
    const res = await adminOutro.as(request(app).get('/tenant/diario'));
    expect(res.body.data.total).toBe(0);
  });
});
