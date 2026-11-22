import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, PushSubscription, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();

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

describe('push no aparelho (AVS-03)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all(
      [PushSubscription, Session, User, Tenant].map((model) => (model as typeof Tenant).deleteMany({})),
    );
  });
  afterAll(async () => {
    await disconnect();
  });

  it('o aparelho grava a inscrição uma vez, outra conta do mesmo navegador a assume, e sair apaga', async () => {
    const ana = await seedSession();
    const bia = await seedSession();
    const subscription = {
      endpoint: 'https://push.example/abc',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
    };

    expect((await ana.as(request(app).get('/me/push'))).body.data).toEqual({});
    expect((await ana.as(request(app).post('/me/push-subscriptions')).send(subscription)).status).toBe(201);
    await ana.as(request(app).post('/me/push-subscriptions')).send(subscription);
    expect(await PushSubscription.countDocuments({})).toBe(1);

    await bia.as(request(app).post('/me/push-subscriptions')).send(subscription);
    expect(String((await PushSubscription.findOne({}).lean())?.User)).toBe(bia.user.id);

    // Ana no longer owns it: her sign-out removes nothing.
    await ana.as(request(app).delete(`/me/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`));
    expect(await PushSubscription.countDocuments({})).toBe(1);
    await bia.as(request(app).delete(`/me/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`));
    expect(await PushSubscription.countDocuments({})).toBe(0);
    expect((await bia.as(request(app).post('/me/push-subscriptions')).send({ endpoint: 'nope' })).status).toBe(400);
  });
});
