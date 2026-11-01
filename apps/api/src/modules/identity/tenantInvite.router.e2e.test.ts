import crypto from 'node:crypto';
import { PROFILE_PERMISSIONS, type Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, Invite, Session, Tenant, User } from '@ethica/db';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env.config.js';
import type { AuthDeps } from '../../middlewares/authentication.middleware.js';
import { createAuthMiddleware } from '../../middlewares/authentication.middleware.js';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import type { MailProvider } from '../../providers/mail/index.js';
import { inviteRouter } from './invite.router.js';
import { createTenantInviteRouter } from './tenantInvite.router.js';

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
          permissions: user.permissions,
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

const buildTestApp = (mailProvider: MailProvider = { send: async () => ({ sent: true }) }) => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const { validToken } = createAuthMiddleware(buildAuthDeps());
  app.use(
    '/tenant',
    createTenantInviteRouter({ validToken, mailProvider, inviteBaseUrl: 'http://localhost:15173/invite' }),
  );
  app.use('/invites', inviteRouter);
  app.use(errorHandler);
  return app;
};

const DEVICE = 'test-agent';

describe('EQP — convites do admin do tenant', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await Promise.all([Invite.deleteMany({}), Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
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
      email: `person-${counter}@empresa.com`,
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

  it.each(['admin', 'manager', 'operator'] as const)(
    'persists chosen role %s in the session tenant, with no token in response',
    async (role) => {
      const { user, tenant } = await seedUser('66666666000901', ['admin']);
      const { tenant: other } = await seedUser('66666666000902');
      const before = Date.now();
      const res = await request(buildTestApp())
        .post('/tenant/invites')
        .set('Cookie', await cookieFor(user.id))
        .set('User-Agent', DEVICE)
        .send({ email: 'guest@example.com', role });
      expect(res.status).toBe(201);
      expect(Object.keys(res.body.data)).toEqual(['id']);
      const invite = await Invite.findById(res.body.data.id).lean();
      expect(invite?.Tenant.toString()).toBe(tenant.id);
      expect(invite?.role).toBe(role);
      expect(invite?.invitedBy.toString()).toBe(user.id);
      expect(invite?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(invite?.sentAt).toBeInstanceOf(Date);
      expect(invite?.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * 24 * 3600_000);
      expect(invite?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * 24 * 3600_000);
      expect(await Invite.countDocuments({ Tenant: other.id })).toBe(0);
    },
  );

  it.each(['manager', 'operator'] as const)('blocks %s before creating or sending', async (role) => {
    const { user } = await seedUser('66666666000903', [role]);
    let sent = false;
    const res = await request(
      buildTestApp({
        send: async () => {
          sent = true;
          return { sent: true };
        },
      }),
    )
      .post('/tenant/invites')
      .set('Cookie', await cookieFor(user.id))
      .set('User-Agent', DEVICE)
      .send({ email: 'blocked@example.com', role: 'admin' });
    expect(res.status).toBe(403);
    expect(await Invite.countDocuments()).toBe(0);
    expect(sent).toBe(false);
  });

  it('requires a session and tenant; rejects tenant injection and invalid role', async () => {
    const app = buildTestApp();
    expect(
      (await request(app).post('/tenant/invites').send({ email: 'guest@example.com', role: 'operator' })).status,
    ).toBe(401);
    const { user } = await seedUser('66666666000904', ['admin']);
    const cookie = await cookieFor(user.id);
    for (const body of [
      { email: 'guest@example.com', role: 'operator', Tenant: user.Tenant?.toString() },
      { email: 'guest@example.com', role: 'platform' },
      { email: 'invalid', role: 'operator' },
    ]) {
      expect(
        (await request(app).post('/tenant/invites').set('Cookie', cookie).set('User-Agent', DEVICE).send(body)).status,
      ).toBe(400);
    }
    await User.findByIdAndUpdate(user.id, { $unset: { Tenant: 1 } });
    expect(
      (
        await request(app)
          .post('/tenant/invites')
          .set('Cookie', cookie)
          .set('User-Agent', DEVICE)
          .send({ email: 'guest@example.com', role: 'operator' })
      ).status,
    ).toBe(424);
    expect(await Invite.countDocuments()).toBe(0);
  });

  it('rejects registered email even in another tenant, without leaking its identity', async () => {
    const { user } = await seedUser('66666666000905', ['admin']);
    const other = await seedUser('66666666000906');
    const res = await request(buildTestApp())
      .post('/tenant/invites')
      .set('Cookie', await cookieFor(user.id))
      .set('User-Agent', DEVICE)
      .send({ email: other.user.email, role: 'manager' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('email_already_registered');
    expect(await Invite.countDocuments()).toBe(0);
    expect(JSON.stringify(res.body)).not.toContain(other.tenant.id);
  });

  it('reissues a pending invite, preserving other tenant invites; reports failed mail as 202', async () => {
    const { user, tenant } = await seedUser('66666666000907', ['admin']);
    const cookie = await cookieFor(user.id);
    const app = buildTestApp();
    const send = (a: ReturnType<typeof buildTestApp>, role = 'operator') =>
      request(a)
        .post('/tenant/invites')
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE)
        .send({ email: 'retry@example.com', role });
    const first = await send(app);
    expect(first.status).toBe(201);
    const other = await seedUser('66666666000908');
    const unrelated = await Invite.create({
      Tenant: other.tenant.id,
      email: 'retry@example.com',
      role: 'operator',
      tokenHash: hashToken('other-token'),
      expiresAt: new Date(Date.now() + 86400000),
      invitedBy: other.user.id,
    });
    const second = await send(buildTestApp({ send: async () => ({ sent: false }) }), 'manager');
    expect(second.status).toBe(202);
    expect(second.body.message).toBe('invite_email_failed');
    const old = await Invite.findById(first.body.data.id).lean();
    const fresh = await Invite.findById(second.body.data.id).lean();
    expect(old?.status).toBe('revoked');
    expect(fresh?.status).toBe('pending');
    expect(fresh?.role).toBe('manager');
    expect(fresh?.sentAt).toBeUndefined();
    expect(fresh?.tokenHash).not.toBe(old?.tokenHash);
    expect(await Invite.countDocuments({ Tenant: tenant.id, status: 'pending' })).toBe(1);
    expect((await Invite.findById(unrelated.id).lean())?.status).toBe('pending');
  });
  it('accepts an operator invite without granting platform administration', async () => {
    const { user, tenant } = await seedUser('66666666000909', ['admin']);
    let token = '';
    const app = buildTestApp({
      send: async (_to, _subject, body) => {
        token = new URL(body.split(' ').at(-1) as string).searchParams.get('token') as string;
        return { sent: true };
      },
    });
    const created = await request(app)
      .post('/tenant/invites')
      .set('Cookie', await cookieFor(user.id))
      .set('User-Agent', DEVICE)
      .send({ email: 'accepted-operator@example.com', role: 'operator' });
    expect(created.status).toBe(201);
    const accepted = await request(app)
      .post(`/invites/${token}/accept`)
      .set('User-Agent', DEVICE)
      .send({ name: 'Operador convidado', password: 'password123!' });
    expect(accepted.status).toBe(201);
    const member = await User.findOne({ email: 'accepted-operator@example.com' }).lean();
    expect(member?.role).toEqual(['operator']);
    expect(member?.isPlatformAdmin).toBe(false);
    expect(member?.Tenant?.toString()).toBe(tenant.id);
    expect(member?.permissions).toEqual(PROFILE_PERMISSIONS.operator);
  });

  // AD-137: a matriz conferida no convite chega ao membro; admin não guarda matriz.
  it('grava a matriz ajustada no convite e nenhuma para admin', async () => {
    const { user } = await seedUser('66666666000910', ['admin']);
    const app = buildTestApp();
    const cookie = await cookieFor(user.id);
    const permissions = { agenda: ['view', 'create', 'update'], finance: ['view', 'create', 'update'] };
    await request(app)
      .post('/tenant/invites')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ email: 'secretaria@example.com', role: 'operator', permissions });
    await request(app)
      .post('/tenant/invites')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ email: 'socio@example.com', role: 'admin', permissions });
    expect((await Invite.findOne({ email: 'secretaria@example.com' }).lean())?.permissions).toEqual(permissions);
    expect((await Invite.findOne({ email: 'socio@example.com' }).lean())?.permissions).toBeUndefined();
  });
});
