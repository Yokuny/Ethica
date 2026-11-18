import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, Session, Tenant, User, wallClockToUtc } from '@ethica/db';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.config.js';
import { createAuthMiddleware } from '../../middlewares/authentication.middleware.js';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import type { AsaasClient } from '../../providers/asaasClient.js';
import { buildAuthDeps } from './auth.deps.js';
import { createBillingRouter } from './billing.router.js';

const DEVICE = 'test-agent';
const TOKEN = 'webhook-token-with-more-than-32-characters';

const fakeAsaas = () => {
  let n = 0;
  return {
    createCustomer: vi.fn(async () => 'cus_1'),
    createPayment: vi.fn(async () => {
      n += 1;
      return { id: `pay_${n}`, invoiceUrl: `https://asaas/i/pay_${n}` };
    }),
    createSubscription: vi.fn(async () => {
      n += 1;
      return { id: `sub_${n}`, invoiceUrl: `https://asaas/i/sub_${n}` };
    }),
    deleteSubscription: vi.fn(async () => undefined),
  } satisfies AsaasClient;
};

const buildTestApp = (asaas?: AsaasClient) => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const { validToken, validSession } = createAuthMiddleware(buildAuthDeps());
  app.use('/billing', createBillingRouter({ validSession, asaas, appUrl: 'https://app', webhookToken: TOKEN }));
  app.get('/closed-check', validToken, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
};

const webhook = (app: express.Express, payment: Record<string, unknown>, event = 'PAYMENT_CONFIRMED') =>
  request(app)
    .post('/billing/webhook')
    .set('asaas-access-token', TOKEN)
    .send({ id: 'evt_1', event, newAttribute: { anything: true }, payment: { customer: 'cus_1', ...payment } });

const dayStart = (date: string) => wallClockToUtc(date, '00:00');

describe('billing routes (AD-230)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await Promise.all([Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
  });

  afterAll(async () => {
    await disconnect();
  });

  let counter = 0;
  const seed = async (role: Role[] = ['admin']) => {
    counter += 1;
    const tenant = await Tenant.create({
      name: 'Perícias Nova',
      document: `${77000000000100 + counter}`,
      status: 'active',
      accessUntil: new Date(),
    });
    const user = await User.create({ name: 'Pessoa', email: `p${counter}@nova.com`, Tenant: tenant._id, role });
    const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
    await Session.create({
      user: user.id,
      tokenHash: hashToken(raw),
      deviceInfo: DEVICE,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    return { tenant, cookie: `refreshToken=${raw}` };
  };

  it('closed office: other routes answer 403, /billing answers the first-payment view (CHK-03, CHK-07)', async () => {
    const { cookie } = await seed();
    const app = buildTestApp(fakeAsaas());

    const closed = await request(app).get('/closed-check').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(closed.status).toBe(403);
    expect(closed.body.message).toBe('tenant_suspended');

    const view = await request(app).get('/billing').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(view.status).toBe(200);
    expect(view.body.data).toMatchObject({ firstPayment: true, trialAvailable: true, canPay: true });
  });

  it('only the admin pays; without Asaas the answer is billing_not_configured', async () => {
    const operator = await seed(['operator']);
    const denied = await request(buildTestApp(fakeAsaas()))
      .post('/billing/pay')
      .set('Cookie', operator.cookie)
      .set('User-Agent', DEVICE)
      .send({ plan: 'monthly' });
    expect(denied.status).toBe(403);

    const admin = await seed();
    const off = await request(buildTestApp())
      .post('/billing/pay')
      .set('Cookie', admin.cookie)
      .set('User-Agent', DEVICE)
      .send({ plan: 'monthly' });
    expect(off.status).toBe(503);
    expect(off.body.message).toBe('billing_not_configured');
  });

  it('trial: one invoice per office, 7 days without grace, then unavailable (CHK-04, CHK-05)', async () => {
    const { tenant, cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    const pay = (plan: string) =>
      request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan });

    const first = await pay('trial');
    expect(first.body.data).toEqual({ url: 'https://asaas/i/pay_1' });
    expect((await pay('trial')).body.data).toEqual({ url: 'https://asaas/i/pay_1' });
    expect(asaas.createCustomer).toHaveBeenCalledTimes(1);
    expect(asaas.createPayment).toHaveBeenCalledTimes(1);

    const paid = await webhook(app, { id: 'pay_1', dueDate: '2026-11-18', confirmedDate: '2026-11-20' });
    expect(paid.status).toBe(200);
    const saved = await Tenant.findById(tenant._id).lean();
    expect(saved?.accessUntil).toEqual(dayStart('2026-11-27'));

    const again = await pay('trial');
    expect(again.status).toBe(409);
    expect(again.body.message).toBe('trial_unavailable');
  });

  it('subscription: the second one replaces the first, renewals extend from the due date plus 5 days (CHK-08)', async () => {
    const { tenant, cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    const pay = (plan: string) =>
      request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan });

    await pay('monthly');
    const yearly = await pay('yearly');
    expect(yearly.body.data).toEqual({ url: 'https://asaas/i/sub_2' });
    expect(asaas.deleteSubscription).toHaveBeenCalledWith('sub_1');

    // A charge of the replaced subscription grants nothing.
    await webhook(app, { id: 'pay_9', subscription: 'sub_1', dueDate: '2026-11-18' });
    expect((await Tenant.findById(tenant._id).lean())?.billing?.paidAt).toBeUndefined();

    await webhook(app, { id: 'pay_10', subscription: 'sub_2', dueDate: '2026-11-18' });
    // CONFIRMED then RECEIVED of the same charge: same date (idempotent).
    await webhook(app, { id: 'pay_10', subscription: 'sub_2', dueDate: '2026-11-18' }, 'PAYMENT_RECEIVED');
    const saved = await Tenant.findById(tenant._id).lean();
    expect(saved?.accessUntil).toEqual(dayStart('2027-11-23'));

    const open = await request(app).get('/closed-check').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(open.status).toBe(200);
  });

  it('single month by boleto/PIX counts from the payment day plus 5 days', async () => {
    const { tenant, cookie } = await seed();
    const app = buildTestApp(fakeAsaas());
    await request(app)
      .post('/billing/pay')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ plan: 'single_month' });

    await webhook(
      app,
      { id: 'pay_1', externalReference: 'single_month', dueDate: '2026-11-18', paymentDate: '2026-11-19' },
      'PAYMENT_RECEIVED',
    );
    expect((await Tenant.findById(tenant._id).lean())?.accessUntil).toEqual(dayStart('2026-12-24'));
  });

  it('webhook: wrong token is 401; unknown event, customer or body is 200 without effect (CHK-09)', async () => {
    const { tenant } = await seed();
    const app = buildTestApp(fakeAsaas());

    const forged = await request(app).post('/billing/webhook').set('asaas-access-token', 'x').send({});
    expect(forged.status).toBe(401);

    await Tenant.updateOne({ _id: tenant._id }, { $set: { 'billing.customerId': 'cus_1' } });
    expect((await webhook(app, { id: 'pay_1', dueDate: '2026-11-18' }, 'PAYMENT_OVERDUE')).status).toBe(200);
    expect((await webhook(app, { id: 'pay_1', customer: 'cus_x', dueDate: '2026-11-18' })).status).toBe(200);
    const odd = await request(app).post('/billing/webhook').set('asaas-access-token', TOKEN).send({ hello: 1 });
    expect(odd.status).toBe(200);
    expect((await Tenant.findById(tenant._id).lean())?.billing?.paidAt).toBeUndefined();
  });
});
