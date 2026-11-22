import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, Session, Tenant, User, wallClockToUtc } from '@ethica/db';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.config.js';
import { createAuthMiddleware } from '../../middlewares/authentication.middleware.js';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import { type AsaasClient, type AsaasPayment, AsaasUnavailableError } from '../../providers/asaasClient.js';
import { buildAuthDeps } from './auth.deps.js';
import { getSessionView } from './auth.service.js';
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
      return `sub_${n}`;
    }),
    firstPayment: vi.fn(async (id: string) => ({ id: `${id}_pay`, invoiceUrl: `https://asaas/i/${id}` })),
    deleteSubscription: vi.fn(async () => undefined),
    getPayment: vi.fn(async (id: string) => ({
      id,
      customer: 'cus_1',
      status: 'PENDING',
      value: 6,
      dueDate: '2026-11-21',
      bankSlipUrl: 'https://asaas/b/1',
    })),
    listPayments: vi.fn(async (): Promise<AsaasPayment[]> => []),
    pixQrCode: vi.fn(async () => ({ encodedImage: 'img', payload: 'pix-code', expirationDate: '2026-11-22 23:59:59' })),
    boletoLine: vi.fn(async () => ({ identificationField: '4619111' })),
  } satisfies AsaasClient;
};

const buildTestApp = (asaas?: AsaasClient) => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const { validToken, validSession } = createAuthMiddleware(buildAuthDeps());
  app.use('/billing', createBillingRouter({ validSession, asaas, returnUrl: 'https://app/', webhookToken: TOKEN }));
  app.get('/closed-check', validToken, (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/session-check', validToken, async (req, res) => {
    res.json(await getSessionView(req.tenantUser));
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

  // Ignored paid events are logged (billing.payment_ignored).
  let logged: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    logged.mockRestore();
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

  it('office suspended by the platform (AD-098) cannot reach /billing either', async () => {
    const { tenant, cookie } = await seed();
    await Tenant.updateOne({ _id: tenant._id }, { status: 'suspended' });
    const res = await request(buildTestApp(fakeAsaas()))
      .get('/billing')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('tenant_suspended');
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

  it('trial: one invoice per office, the first month plus the 5 of grace (AD-247), then unavailable (CHK-04, CHK-05)', async () => {
    const { tenant, cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    const pay = (plan: string) =>
      request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan });

    const first = await pay('trial');
    expect(first.body.data).toEqual({ paymentId: 'pay_1', url: 'https://asaas/i/pay_1' });
    expect((await pay('trial')).body.data).toEqual({ paymentId: 'pay_1', url: 'https://asaas/i/pay_1' });
    expect((await Tenant.findById(tenant._id).lean())?.billing?.pendingSince).toBeInstanceOf(Date);
    expect(asaas.createCustomer).toHaveBeenCalledTimes(1);
    expect(asaas.createPayment).toHaveBeenCalledTimes(1);

    const paid = await webhook(app, { id: 'pay_1', dueDate: '2026-11-18', confirmedDate: '2026-11-20' });
    expect(paid.status).toBe(200);
    const saved = await Tenant.findById(tenant._id).lean();
    expect(saved?.accessUntil).toEqual(dayStart('2026-12-25'));
    // Paid: nothing pending, the plans screen stops checking Asaas (AD-251).
    expect(saved?.billing?.pendingSince).toBeUndefined();

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
    expect(yearly.body.data).toEqual({ paymentId: 'sub_2_pay', url: 'https://asaas/i/sub_2' });
    expect(asaas.deleteSubscription).toHaveBeenCalledWith('sub_1');

    // A charge of the replaced subscription grants nothing, and is logged.
    await webhook(app, { id: 'pay_9', subscription: 'sub_1', dueDate: '2026-11-18' });
    expect((await Tenant.findById(tenant._id).lean())?.billing?.paidAt).toBeUndefined();
    expect(String(logged.mock.calls.at(-1)?.[0])).toContain('replaced_subscription');

    await webhook(app, { id: 'pay_10', subscription: 'sub_2', dueDate: '2026-11-18' });
    // CONFIRMED then RECEIVED of the same charge: same date (idempotent).
    await webhook(app, { id: 'pay_10', subscription: 'sub_2', dueDate: '2026-11-18' }, 'PAYMENT_RECEIVED');
    const saved = await Tenant.findById(tenant._id).lean();
    expect(saved?.accessUntil).toEqual(dayStart('2027-11-23'));

    const open = await request(app).get('/closed-check').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(open.status).toBe(200);
  });

  it('premium (AD-275): troca o plano base, estende o acesso e o módulo; a sessão mostra o módulo; estorno tira os dois', async () => {
    const { tenant, cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    const pay = (plan: string) =>
      request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan });
    const saved = async () => Tenant.findById(tenant._id).lean();

    await pay('monthly');
    await pay('automation_monthly');
    expect(asaas.deleteSubscription).toHaveBeenCalledWith('sub_1');
    expect((await saved())?.billing?.subscriptionPlan).toBe('automation_monthly');

    const payment = { id: 'pay_p', subscription: 'sub_2', dueDate: '2026-11-18' };
    await webhook(app, payment);
    expect((await saved())?.accessUntil).toEqual(dayStart('2026-12-23'));
    expect((await saved())?.automationUntil).toEqual(dayStart('2026-12-23'));

    const session = await request(app).get('/session-check').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(session.body.tenant.automationUntil).toBe(dayStart('2026-12-23').toISOString());

    await webhook(app, payment, 'PAYMENT_REFUNDED');
    expect((await saved())?.automationUntil).toEqual(dayStart('2026-11-18'));
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

  it('an old trial invoice paid after another payment grants nothing', async () => {
    const { tenant, cookie } = await seed();
    const app = buildTestApp(fakeAsaas());
    const pay = (plan: string) =>
      request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan });
    await pay('trial');
    await pay('single_month');

    await webhook(app, {
      id: 'pay_2',
      externalReference: 'single_month',
      dueDate: '2026-11-18',
      paymentDate: '2026-11-18',
    });
    await webhook(app, { id: 'pay_1', dueDate: '2026-11-18', paymentDate: '2027-02-01' });
    expect((await Tenant.findById(tenant._id).lean())?.accessUntil).toEqual(dayStart('2026-12-23'));
  });

  it('refund or chargeback takes back the paid period; a won dispute gives it back; partial refund keeps it (AD-232)', async () => {
    const { tenant, cookie } = await seed();
    const app = buildTestApp(fakeAsaas());
    const accessOf = async () => (await Tenant.findById(tenant._id).lean())?.accessUntil;
    await request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan: 'monthly' });

    const first = { id: 'pay_a', subscription: 'sub_1', dueDate: '2026-11-18', confirmedDate: '2026-11-18' };
    const second = { id: 'pay_b', subscription: 'sub_1', dueDate: '2026-12-18', confirmedDate: '2026-12-18' };
    await webhook(app, first);
    await webhook(app, second);
    expect(await accessOf()).toEqual(dayStart('2027-01-23'));

    await webhook(app, second, 'PAYMENT_PARTIALLY_REFUNDED');
    expect(await accessOf()).toEqual(dayStart('2027-01-23'));

    // Renewal refunded: the access ends at its due date.
    await webhook(app, second, 'PAYMENT_REFUNDED');
    expect(await accessOf()).toEqual(dayStart('2026-12-18'));

    // Chargeback of the first payment: back to its start (closed); the dispute won pays it again.
    await webhook(app, first, 'PAYMENT_CHARGEBACK_REQUESTED');
    expect(await accessOf()).toEqual(dayStart('2026-11-18'));
    await webhook(app, first, 'PAYMENT_CONFIRMED');
    expect(await accessOf()).toEqual(dayStart('2026-12-23'));
  });

  it('refund of the trial closes the office, even with paidAt already set by the trial itself', async () => {
    const { tenant, cookie } = await seed();
    const app = buildTestApp(fakeAsaas());
    await request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan: 'trial' });
    const trial = { id: 'pay_1', dueDate: '2026-11-18', paymentDate: '2026-11-18' };
    await webhook(app, trial, 'PAYMENT_RECEIVED');
    await webhook(app, trial, 'PAYMENT_REFUNDED');
    expect((await Tenant.findById(tenant._id).lean())?.accessUntil).toEqual(dayStart('2026-11-18'));
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

  it('without the webhook, the plans screen finds the paid charge in Asaas, at most once every 30 s (CHK-14, AD-251)', async () => {
    const { tenant, cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    await request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan: 'trial' });
    const view = () => request(app).get('/billing').set('Cookie', cookie).set('User-Agent', DEVICE);

    // Asaas down: the screen still answers.
    asaas.listPayments.mockRejectedValueOnce(new AsaasUnavailableError(500));
    expect((await view()).body.data.accessUntil).toBeDefined();
    expect((await view()).status).toBe(200);
    expect(asaas.listPayments).toHaveBeenCalledTimes(1);

    // Paid after newer charges were created (the dev account case); the next check, 30 s later, opens it.
    asaas.listPayments.mockResolvedValue([
      { id: 'pay_3', customer: 'cus_1', status: 'PENDING', dueDate: '2026-11-21' },
      { id: 'pay_1', customer: 'cus_1', status: 'CONFIRMED', dueDate: '2026-11-21', confirmedDate: '2026-11-21' },
    ]);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    const opened = await view();
    vi.mocked(Date.now).mockRestore();
    expect(opened.body.data).toMatchObject({ firstPayment: false, accessUntil: dayStart('2026-12-26').toISOString() });
    const saved = await Tenant.findById(tenant._id).lean();
    expect(saved?.billing?.pendingSince).toBeUndefined();
    expect(asaas.listPayments).toHaveBeenCalledWith('cus_1');
  });

  it('PIX and boleto of a charge of the office for the Ethica screen; another office or no Pix key refused (CHK-12, CHK-13)', async () => {
    const { cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    await request(app)
      .post('/billing/pay')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ plan: 'single_month' });
    const payment = (method: string, id = 'pay_1') =>
      request(app).get(`/billing/payments/${id}?method=${method}`).set('Cookie', cookie).set('User-Agent', DEVICE);

    expect((await payment('pix')).body.data).toEqual({
      id: 'pay_1',
      valueCents: 600,
      dueDate: '2026-11-21',
      paid: false,
      pix: { image: 'img', code: 'pix-code', expiresAt: '2026-11-22 23:59:59' },
    });
    expect((await payment('boleto')).body.data.boleto).toEqual({ line: '4619111', pdfUrl: 'https://asaas/b/1' });
    expect((await payment('card')).status).toBe(400);

    asaas.pixQrCode.mockRejectedValueOnce(new AsaasUnavailableError(400));
    const noKey = await payment('pix');
    expect(noKey.status).toBe(502);
    expect(noKey.body.message).toBe('pix_unavailable');

    asaas.getPayment.mockResolvedValueOnce({ id: 'pay_x', customer: 'cus_other', dueDate: '2026-11-21' } as never);
    expect((await payment('pix', 'pay_x')).status).toBe(404);
    // Only a charge id goes into the Asaas URL.
    expect((await payment('pix', 'sub_1%2F..')).status).toBe(400);
  });

  it('a subscription renewal without the webhook is found too, after the first payment (CHK-14)', async () => {
    const { tenant, cookie } = await seed();
    const asaas = fakeAsaas();
    const app = buildTestApp(asaas);
    await request(app).post('/billing/pay').set('Cookie', cookie).set('User-Agent', DEVICE).send({ plan: 'monthly' });
    // First month paid long ago and over: paidAt set, nothing pending, the subscription still alive.
    await Tenant.updateOne(
      { _id: tenant._id },
      { $set: { 'billing.paidAt': new Date('2026-10-01') }, $unset: { 'billing.pendingSince': 1 } },
    );
    asaas.listPayments.mockResolvedValue([
      { id: 'pay_r', customer: 'cus_1', subscription: 'sub_1', status: 'CONFIRMED', dueDate: '2026-11-18' },
    ]);

    const view = await request(app).get('/billing').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(view.body.data.accessUntil).toBe(dayStart('2026-12-23').toISOString());
  });
});
