import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import { connect, dateInDisplayTz, disconnect, hashToken, Session, Tenant, Transaction, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();
const today = dateInDisplayTz(new Date());
const year = Number(today.slice(0, 4));

let counter = 0;
const seedTenant = async () => {
  counter += 1;
  return Tenant.create({
    name: `Escritório meta ${counter}`,
    document: `7777777700${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};
const seedSession = async (tenantId: TenantDocument['_id'], role: Role[]) => {
  counter += 1;
  const user = await User.create({ name: `Pessoa ${counter}`, email: `meta-${counter}@x.com`, Tenant: tenantId, role });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  return <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
};

const income = (
  tenantId: TenantDocument['_id'],
  dueDate: string,
  installments: { amountCents: number; date: string }[],
) =>
  Transaction.create({
    Tenant: tenantId,
    kind: 'income',
    category: 'fixed_fees',
    description: 'Honorários',
    amountCents: 1_000_000,
    dueDate,
    status: 'partial',
    installments,
  });

describe('meta de receita do ano (MRA, AD-258)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([Transaction.deleteMany({}), Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('o realizado conta a data efetiva do recebimento, dentro do ano, sem anuladas nem despesas', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    expect(
      (await admin(request(app).put('/tenant/office/revenue-goal')).send({ year, amountCents: 12_000_000 })).status,
    ).toBe(200);
    // Due in the past year, received on 1 January: counts.
    await income(tenant._id, `${year - 1}-11-10`, [{ amountCents: 100_000, date: `${year}-01-01` }]);
    // Due this year, received on 31 December of the past year: does not count.
    await income(tenant._id, `${year}-02-01`, [{ amountCents: 200_000, date: `${year - 1}-12-31` }]);
    // Due next year, received today: counts.
    await income(tenant._id, `${year + 1}-03-01`, [{ amountCents: 300_000, date: today }]);
    // Annulled fee and an expense: never count.
    await Transaction.create({
      Tenant: tenant._id,
      kind: 'income',
      category: 'fixed_fees',
      description: 'Anulado',
      amountCents: 500_000,
      dueDate: today,
      status: 'canceled',
      installments: [{ amountCents: 500_000, date: today }],
    });
    await Transaction.create({
      Tenant: tenant._id,
      kind: 'expense',
      category: 'travel',
      description: 'Deslocamento',
      amountCents: 50_000,
      dueDate: today,
      status: 'settled',
      settledDate: today,
    });

    const res = await admin(request(app).get('/finance/revenue-goal'));
    expect(res.status).toBe(200);
    const goal = res.body.data;
    expect(goal).toMatchObject({ year, goalCents: 12_000_000, receivedCents: 400_000 });
    expect(goal.monthsLeft).toBe(13 - Number(today.slice(5, 7)));
    expect(goal.perMonthCents).toBe(Math.ceil((12_000_000 - 400_000) / goal.monthsLeft));
    expect(goal.expectedCents).toBe(1_000_000 * (13 - goal.monthsLeft));

    expect(goal.byMonth).toHaveLength(12);
    expect(goal.byMonth[0]).toEqual({ month: `${year}-01`, receivedCents: 100_000 });
    expect(goal.byMonth.reduce((total: number, row: { receivedCents: number }) => total + row.receivedCents, 0)).toBe(
      400_000,
    );

    // The past year: its own realized, the whole goal expected and nothing left per month.
    await admin(request(app).put('/tenant/office/revenue-goal')).send({ year: year - 1, amountCents: 150_000 });
    const past = (await admin(request(app).get(`/finance/revenue-goal?year=${year - 1}`))).body.data;
    expect(past).toMatchObject({ year: year - 1, goalCents: 150_000, receivedCents: 200_000, expectedCents: 150_000 });
    expect(past.monthsLeft).toBe(0);
    expect(past.perMonthCents).toBeUndefined();
    expect(past.years).toEqual([year, year - 1]);

    const office = await admin(request(app).get('/tenant/office'));
    expect(office.body.data.revenueGoals).toEqual([
      { year, amountCents: 12_000_000 },
      { year: year - 1, amountCents: 150_000 },
    ]);
  });

  it('cada ano tem a sua meta: regravar troca a do ano, 0 remove só aquele ano', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    await admin(request(app).put('/tenant/office/revenue-goal')).send({ year: year + 1, amountCents: 9_000_000 });
    const current = (await admin(request(app).get('/finance/revenue-goal'))).body.data;
    expect(current.goalCents).toBeUndefined();
    expect(current.years).toEqual([year + 1, year]);
    const future = (await admin(request(app).get(`/finance/revenue-goal?year=${year + 1}`))).body.data;
    expect(future).toMatchObject({ goalCents: 9_000_000, expectedCents: 0, monthsLeft: 12, perMonthCents: 750_000 });

    await admin(request(app).put('/tenant/office/revenue-goal')).send({ year, amountCents: 5_000_000 });
    await admin(request(app).put('/tenant/office/revenue-goal')).send({ year, amountCents: 6_000_000 });
    const removed = await admin(request(app).put('/tenant/office/revenue-goal')).send({
      year: year + 1,
      amountCents: 0,
    });
    expect(removed.body.data.revenueGoals).toEqual([{ year, amountCents: 6_000_000 }]);
  });

  it('só o admin grava; ler exige ver o Financeiro', async () => {
    const tenant = await seedTenant();
    const manager = await seedSession(tenant._id, ['manager']);
    const operator = await seedSession(tenant._id, ['operator']);
    expect((await manager(request(app).put('/tenant/office/revenue-goal')).send({ year, amountCents: 1 })).status).toBe(
      403,
    );
    expect((await manager(request(app).get('/finance/revenue-goal'))).status).toBe(200);
    expect((await operator(request(app).get('/finance/revenue-goal'))).status).toBe(403);
  });
});
