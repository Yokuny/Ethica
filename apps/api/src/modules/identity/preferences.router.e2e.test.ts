import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env.config.js';
import type { AuthDeps } from '../../middlewares/authentication.middleware.js';
import { createAuthMiddleware } from '../../middlewares/authentication.middleware.js';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import { createPreferencesRouter } from './preferences.router.js';

const buildAuthDeps = (): AuthDeps => ({
  findSessionByHash: async (tokenHash) => {
    const session = await Session.findOne({ tokenHash }).lean();
    return session ? { user: session.user.toString(), deviceInfo: session.deviceInfo } : null;
  },
  revokeAllSessions: async (userId) => {
    await Session.deleteMany({ user: userId });
  },
  getUserById: async (userId) => {
    const user = await User.findById(userId).lean();
    return user
      ? {
          id: user._id.toString(),
          tenant: user.Tenant?.toString(),
          role: user.role,
          permissoes: user.permissoes,
          isPlatformAdmin: user.isPlatformAdmin,
          active: user.active,
        }
      : null;
  },
  getTenantById: async (tenantId) => {
    const tenant = await Tenant.findById(tenantId).lean();
    return tenant ? { id: tenant._id.toString(), name: tenant.name, status: tenant.status } : null;
  },
});

const buildTestApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const { validToken } = createAuthMiddleware(buildAuthDeps());
  app.use('/me', createPreferencesRouter({ validToken }));
  app.use(errorHandler);
  return app;
};

const DEVICE = 'test-agent';

describe('preferences routes (ENR-03)', () => {
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
  const seedUser = async (tenantDocument: string, role: Role[] = ['operator']) => {
    const tenant = await Tenant.create({
      name: `Empresa ${tenantDocument}`,
      document: tenantDocument,
      status: 'active',
    });
    counter += 1;
    const user = await User.create({
      name: `Pessoa ${counter}`,
      email: `pessoa-${counter}@empresa.com`,
      password: 'hash',
      Tenant: tenant._id,
      role,
    });
    return { tenant, user };
  };

  const cookieFor = async (userId: string): Promise<string> => {
    const rawToken = jwt.sign({ user: userId, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
    await Session.create({
      user: userId,
      tokenHash: hashToken(rawToken),
      deviceInfo: DEVICE,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    return `refreshToken=${rawToken}`;
  };

  it('reads the default for an account created before the feature (no backfill needed)', async () => {
    const { user } = await seedUser('66666666000101');
    const cookie = await cookieFor(user.id);

    const res = await request(buildTestApp()).get('/me/preferences').set('Cookie', cookie).set('User-Agent', DEVICE);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ onboardingDismissed: false, deadlineReminderEmail: true, blocosOcultos: [] });
  });

  it('PATCH persists the choice, can be undone, and is read back by GET', async () => {
    const { user } = await seedUser('66666666000102', ['admin']);
    const cookie = await cookieFor(user.id);
    const app = buildTestApp();

    const dismissed = await request(app)
      .patch('/me/preferences')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ onboardingDismissed: true });
    expect(dismissed.status).toBe(200);
    expect(dismissed.body.data).toEqual({ onboardingDismissed: true, deadlineReminderEmail: true, blocosOcultos: [] });
    expect(
      (await request(app).get('/me/preferences').set('Cookie', cookie).set('User-Agent', DEVICE)).body.data,
    ).toEqual({
      onboardingDismissed: true,
      deadlineReminderEmail: true,
      blocosOcultos: [],
    });

    const reopened = await request(app)
      .patch('/me/preferences')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ onboardingDismissed: false });
    expect(reopened.body.data).toEqual({ onboardingDismissed: false, deadlineReminderEmail: true, blocosOcultos: [] });
  });

  it('the preference never carries progress: unknown keys (steps, Tenant) are rejected and nothing is saved', async () => {
    const { user, tenant } = await seedUser('66666666000103');
    const cookie = await cookieFor(user.id);
    const app = buildTestApp();

    for (const body of [
      { onboardingDismissed: true, steps: { customer: true } },
      { onboardingDismissed: true, Tenant: tenant.id },
      { onboardingDismissed: 'sim' },
      {},
    ]) {
      const res = await request(app)
        .patch('/me/preferences')
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE)
        .send(body);
      expect(res.status).toBe(400);
    }
    const stored = await User.findById(user.id).lean();
    expect(stored?.preferences?.onboardingDismissed ?? false).toBe(false);
  });

  it('each person only touches their own preference, across users and tenants', async () => {
    const a = await seedUser('66666666000104');
    const b = await seedUser('66666666000105');
    const app = buildTestApp();

    await request(app)
      .patch('/me/preferences')
      .set('Cookie', await cookieFor(a.user.id))
      .set('User-Agent', DEVICE)
      .send({ onboardingDismissed: true });

    const resB = await request(app)
      .get('/me/preferences')
      .set('Cookie', await cookieFor(b.user.id))
      .set('User-Agent', DEVICE);
    expect(resB.body.data).toEqual({ onboardingDismissed: false, deadlineReminderEmail: true, blocosOcultos: [] });
    expect((await User.findById(b.user.id).lean())?.preferences?.onboardingDismissed ?? false).toBe(false);
  });

  it('a PATCH only changes the caller, even when an older user exists in the collection', async () => {
    const older = await seedUser('66666666000107');
    const newer = await seedUser('66666666000108');
    const app = buildTestApp();

    await request(app)
      .patch('/me/preferences')
      .set('Cookie', await cookieFor(newer.user.id))
      .set('User-Agent', DEVICE)
      .send({ onboardingDismissed: true });

    expect((await User.findById(newer.user.id).lean())?.preferences?.onboardingDismissed).toBe(true);
    expect((await User.findById(older.user.id).lean())?.preferences?.onboardingDismissed ?? false).toBe(false);
  });

  it('responds 401 without a session and 403 for a user without any role', async () => {
    const { user } = await seedUser('66666666000106', []);
    const cookie = await cookieFor(user.id);
    const app = buildTestApp();

    expect((await request(app).get('/me/preferences').set('User-Agent', DEVICE)).status).toBe(401);
    expect((await request(app).get('/me/preferences').set('Cookie', cookie).set('User-Agent', DEVICE)).status).toBe(
      403,
    );
  });

  it('guarda os blocos ocultos do início e restaura o padrão com a lista vazia (AD-136)', async () => {
    const { user } = await seedUser('66666666000199');
    const cookie = await cookieFor(user.id);
    const app = buildTestApp();
    const oculto = await request(app)
      .patch('/me/preferences')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ blocosOcultos: ['cash_flow', 'by_court'] });
    expect(oculto.body.data.blocosOcultos).toEqual(['cash_flow', 'by_court']);
    const invalido = await request(app)
      .patch('/me/preferences')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ blocosOcultos: ['nao_existe'] });
    expect(invalido.status).toBe(400);
    const padrao = await request(app)
      .patch('/me/preferences')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ blocosOcultos: [] });
    expect(padrao.body.data.blocosOcultos).toEqual([]);
  });
});
