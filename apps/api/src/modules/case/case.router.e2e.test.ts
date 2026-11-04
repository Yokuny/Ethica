import crypto from 'node:crypto';
import type { Permissions, Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import { Case, connect, Deadline, disconnect, hashToken, Party, Session, Tenant, Transaction, User } from '@ethica/db';
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

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[], permissions?: Permissions) => {
  counter += 1;
  const user = await User.create({
    name: `Pessoa ${counter}`,
    email: `case-${counter}@x.com`,
    Tenant: tenantId,
    role,
    permissions,
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

const CASE = {
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
} as const;

describe('perícias — matriz, fase, contratante e paradas (GES-02/03/05/06)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Transaction.deleteMany({}),
      Deadline.deleteMany({}),
      Party.deleteMany({}),
      Case.deleteMany({}),
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
    expect((await secretaria.as(request(app).post('/expert-cases')).send(CASE)).status).toBe(403);
    expect(await Case.countDocuments()).toBe(0);
    expect((await secretaria.as(request(app).get('/finance/summary'))).status).toBe(200);
    expect((await secretaria.as(request(app).get('/agenda'))).status).toBe(403);

    const operator = await seedSession(tenant._id, ['operator']);
    expect((await operator.as(request(app).get('/finance/summary'))).status).toBe(403);
    expect((await operator.as(request(app).post('/expert-cases')).send(CASE)).status).toBe(201);
  });

  it('fase e status: cadastro e edição, encerrado nas perdas e valor fora da lista recusado (AD-178)', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['admin']);
    const { body } = await as(request(app).post('/expert-cases')).send({ ...CASE, phase: 'awaiting_site_info' });
    const id = body.data.id as string;
    expect(body.data).toMatchObject({ phase: 'awaiting_site_info', status: 'active' });
    const open = async () =>
      (await as(request(app).get('/expert-cases/stats'))).body.data.groups.find(
        (group: { key: string }) => group.key === 'open',
      )?.count;
    expect(await open()).toBe(1);

    const settled = await as(request(app).patch(`/expert-cases/${id}`)).send({ phase: 'settlement' });
    expect(settled.body.data.phase).toBe('settlement');
    expect(await open()).toBe(0);
    await as(request(app).patch(`/expert-cases/${id}`)).send({ phase: 'awaiting_inspection', status: 'canceled' });
    expect(await open()).toBe(0);

    expect((await as(request(app).patch(`/expert-cases/${id}`)).send({ status: 'appointed' })).status).toBe(400);
    expect((await as(request(app).patch(`/expert-cases/${id}`)).send({ phase: 'accepted' })).status).toBe(400);
  });

  it('honorário contratado do assistente técnico vira receita com o contratante (AD-135)', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['admin']);
    const { body } = await as(request(app).post('/expert-cases')).send({
      ...CASE,
      courtType: undefined,
      role: 'technical_assistant',
      parties: [
        { side: 'plaintiff', type: 'party', name: 'Maria Reclamante', client: true },
        { side: 'defendant', type: 'party', name: 'Empresa Ré' },
      ],
    });
    expect(body.data.parties[0]).toMatchObject({ name: 'Maria Reclamante', client: true });

    await as(request(app).patch(`/expert-cases/${body.data.id}`)).send({ fixedFeesCents: 300_000 });
    await expect
      .poll(async () => (await as(request(app).get('/finance/entries'))).body.data?.items?.[0])
      .toMatchObject({ category: 'contracted_fees', amountCents: 300_000, client: 'Maria Reclamante' });

    const expert = await as(request(app).post('/expert-cases')).send({
      ...CASE,
      processNumber: '0001234-56.2026.5.02.0002',
      parties: [{ side: 'plaintiff', type: 'party', name: 'Outra', client: true }],
    });
    expect(expert.status).toBe(422);
  });

  it('paradas do início: total e as mais antigas, sem as suspensas (GES-05)', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['operator']);
    await Case.create([
      { ...CASE, Tenant: tenant._id, nominationDate: '2020-01-10' },
      {
        ...CASE,
        Tenant: tenant._id,
        processNumber: '0001234-56.2026.5.02.0003',
        nominationDate: '2020-01-10',
        status: 'suspended' as const,
      },
    ]);
    const res = await as(request(app).get('/expert-cases/stalled'));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0]).toMatchObject({ processNumber: CASE.processNumber });
  });
});
