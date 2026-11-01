import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import { Activity, Case, connect, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
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
    email: `activity-log-${counter}@x.com`,
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
      Activity.deleteMany({}),
      Case.deleteMany({}),
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
    const operator = await seedSession(tenant._id, ['operator']);

    const created = await operator.as(request(app).post('/expert-cases')).send({
      processNumber: '0001234-56.2026.5.02.0001',
      courtType: 'labor',
      role: 'court_expert',
      court: 'TRT2',
      subject: 'Insalubridade',
    });
    expect(created.status).toBe(201);
    // Reads do not go into the log.
    await operator.as(request(app).get('/expert-cases'));

    await expect.poll(async () => (await admin.as(request(app).get('/tenant/activity-log'))).body.data?.total).toBe(1);
    const res = await admin.as(request(app).get(`/tenant/activity-log?module=expert_cases&userId=${operator.user.id}`));
    expect(res.body.data.items[0]).toMatchObject({
      userName: operator.user.name,
      module: 'expert_cases',
      action: 'create',
      recordId: created.body.data.id,
      label: '0001234-56.2026.5.02.0001',
    });

    const empty = await admin.as(request(app).get('/tenant/activity-log?action=delete'));
    expect(empty.body.data.total).toBe(0);

    const negado = await operator.as(request(app).get('/tenant/activity-log'));
    expect(negado.status).toBe(403);
  });

  it('não grava ação recusada nem mistura escritórios', async () => {
    const tenant = await seedTenant();
    const other = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const adminOther = await seedSession(other._id, ['admin']);

    const declined = await operator.as(request(app).delete('/expert-cases/6650f1a2b3c4d5e6f7a8b9c0'));
    expect(declined.status).toBe(403);
    await operator.as(request(app).patch('/me/profile')).send({ name: 'Nome Novo' });

    await expect.poll(async () => Activity.countDocuments({ Tenant: tenant._id })).toBe(1);
    const res = await adminOther.as(request(app).get('/tenant/activity-log'));
    expect(res.body.data.total).toBe(0);
  });
});
