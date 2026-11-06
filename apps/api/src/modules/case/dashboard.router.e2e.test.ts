import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { Case, connect, disconnect, hashToken, Session, Tenant, Transaction, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp({ storage: null });

let counter = 0;
const seedSession = async (role: Role[] = ['admin']) => {
  counter += 1;
  const tenant = await Tenant.create({
    name: `Escritório ${counter}`,
    document: `6666666600${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
  const user = await User.create({ name: 'Perito', email: `dash-${counter}@x.com`, Tenant: tenant._id, role });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { tenant, as };
};

const base = (Tenant: unknown, subject: string, extra: object) => ({
  Tenant,
  subject,
  role: 'court_expert',
  phase: 'awaiting_scheduling',
  status: 'active',
  ...extra,
});

describe('Dashboard (DSH)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Case.deleteMany({}),
      Transaction.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('conta por tipo, encerrados e perícias pelo ano da nomeação ou do cadastro (DSH-02 a 04)', async () => {
    const { tenant, as } = await seedSession();
    const other = await seedSession();
    const year = String(new Date().getFullYear());
    await Case.collection.insertMany([
      { ...base(tenant._id, 'a', { nominationDate: '2024-03-01' }), createdAt: new Date() },
      { ...base(tenant._id, 'b', { nominationDate: '2024-06-01', phase: 'fees_received' }), createdAt: new Date() },
      { ...base(tenant._id, 'c', { status: 'canceled', nominationDate: '2023-01-01' }), createdAt: new Date() },
      { ...base(tenant._id, 'g', {}), createdAt: new Date() },
      { ...base(tenant._id, 'd', { role: 'technical_assistant', phase: 'assistance_hired' }), createdAt: new Date() },
      { ...base(tenant._id, 'e', { role: 'other', serviceType: 'Parceria', phase: 'custom' }), createdAt: new Date() },
      { ...base(other.tenant._id, 'f', {}), createdAt: new Date() },
    ]);

    const { body } = await as(request(app).get('/expert-cases/dashboard'));
    expect(body.data).toMatchObject({ total: 6, closed: 2 });
    expect(body.data.byType).toEqual([
      { role: 'court_expert', count: 4 },
      { role: 'other', serviceType: 'Parceria', count: 1 },
      { role: 'technical_assistant', count: 1 },
    ]);
    expect(body.data.courtExpertByYear).toEqual([
      { year: '2024', count: 2 },
      { year, count: 1 },
    ]);
  });

  it('honorários: recebido pelo ano da parcela, saldo a receber, sem cancelados; só com o Financeiro (DSH-05, 06)', async () => {
    const { tenant, as } = await seedSession();
    const income = {
      Tenant: tenant._id,
      kind: 'income',
      category: 'fixed_fees',
      description: 'Honorários',
      dueDate: '2025-01-10',
    };
    await Transaction.collection.insertMany([
      {
        ...income,
        amountCents: 100_000,
        status: 'partial',
        installments: [
          { amountCents: 30_000, date: '2024-12-20' },
          { amountCents: 20_000, date: '2025-01-05' },
        ],
      },
      {
        ...income,
        amountCents: 90_000,
        status: 'canceled',
        installments: [{ amountCents: 90_000, date: '2025-01-05' }],
      },
    ]);

    const { body } = await as(request(app).get('/finance/dashboard'));
    expect(body.data).toEqual({
      receivableCents: 50_000,
      receivedByYear: [
        { year: '2024', cents: 30_000 },
        { year: '2025', cents: 20_000 },
      ],
    });

    const operator = await seedSession(['operator']);
    expect((await operator.as(request(app).get('/finance/dashboard'))).status).toBe(403);
    expect((await operator.as(request(app).get('/expert-cases/dashboard'))).status).toBe(200);
  });
});
