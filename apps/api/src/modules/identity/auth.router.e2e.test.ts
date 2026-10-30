import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../config/env.config.js';
import type { AuthDeps } from '../../middlewares/authentication.middleware.js';
import { createAuthMiddleware } from '../../middlewares/authentication.middleware.js';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import { createAuthRouter } from './auth.router.js';

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
  app.use('/auth', createAuthRouter({ validToken }));
  app.use(errorHandler);
  return app;
};

const DEVICE = 'test-agent';

describe('auth routes', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await Promise.all([Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
  });

  afterAll(async () => {
    await disconnect();
  });

  const seedUser = async (overrides: { active?: boolean; role?: Role[] } = {}) => {
    const tenant = await Tenant.create({ name: 'Empresa Login', document: '55555555000155', status: 'active' });
    const hashed = await bcrypt.hash('senhaCorreta123', 10);
    const user = await User.create({
      name: 'Usuária Login',
      email: 'login@empresa.com',
      password: hashed,
      Tenant: tenant._id,
      role: overrides.role ?? ['manager'],
      active: overrides.active ?? true,
    });
    return { tenant, user };
  };

  // GET /auth/users não precisa passar pelo POST /auth/signin de verdade (e
  // consumir seu orçamento de 5 tentativas/15min, signinRateLimit) — mesmo
  // atalho de issueSessionCookie em conversation.router.e2e.test.ts, que
  // grava a Session direto e assina o JWT com o mesmo segredo/shape.
  const issueSessionCookie = async (userId: string): Promise<string> => {
    const rawToken = jwt.sign({ user: userId, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
    await Session.create({
      user: userId,
      tokenHash: hashToken(rawToken),
      deviceInfo: DEVICE,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    return `refreshToken=${rawToken}`;
  };

  describe('POST /auth/signin', () => {
    it('sets an httpOnly refreshToken cookie and persists a matching Session on correct credentials (FND-04)', async () => {
      const { user } = await seedUser();

      const res = await request(buildTestApp())
        .post('/auth/signin')
        .set('User-Agent', DEVICE)
        .send({ email: 'login@empresa.com', password: 'senhaCorreta123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: undefined, message: 'signed_in_successfully' });

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie?.[0]).toMatch(/refreshToken=/);
      expect(setCookie?.[0]).toMatch(/HttpOnly/i);

      const rawToken = setCookie[0].split(';')[0].split('=')[1];
      const session = await Session.findOne({ tokenHash: hashToken(rawToken) }).lean();
      expect(session).not.toBeNull();
      expect(session?.user.toString()).toBe(user.id);
      expect(session?.deviceInfo).toBe(DEVICE);
    });

    it('responds 401 and creates no session on wrong password (FND-04)', async () => {
      await seedUser();

      const res = await request(buildTestApp())
        .post('/auth/signin')
        .set('User-Agent', DEVICE)
        .send({ email: 'login@empresa.com', password: 'senhaErrada' });

      expect(res.status).toBe(401);
      expect(await Session.countDocuments({})).toBe(0);
    });

    it('never 401s on GET /auth/session called immediately after signin in the same sequence (Risk 5 — awaited session write)', async () => {
      await seedUser();
      const app = buildTestApp();

      const signinRes = await request(app)
        .post('/auth/signin')
        .set('User-Agent', DEVICE)
        .send({ email: 'login@empresa.com', password: 'senhaCorreta123' });
      const cookie = (signinRes.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      const sessionRes = await request(app).get('/auth/session').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(sessionRes.status).not.toBe(401);
      expect(sessionRes.status).toBe(200);
    });
  });

  describe('GET /auth/session', () => {
    it("returns {tenant,user,role} read from the database — a live update to the user's name/tenant is reflected, and a suspended tenant gets 403 (FND-05, AD-014)", async () => {
      const { tenant, user } = await seedUser();
      const app = buildTestApp();

      const signinRes = await request(app)
        .post('/auth/signin')
        .set('User-Agent', DEVICE)
        .send({ email: 'login@empresa.com', password: 'senhaCorreta123' });
      const cookie = (signinRes.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      // Muda o estado no banco DEPOIS de emitida a sessão — se a resposta
      // vier do payload do token (ou de algo cacheado), o valor antigo
      // apareceria; vindo do banco, reflete a mudança.
      await User.findByIdAndUpdate(user._id, { name: 'Nome Atualizado' });
      await Tenant.findByIdAndUpdate(tenant._id, { name: 'Empresa Renomeada' });

      const res = await request(app).get('/auth/session').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        tenant: { id: tenant.id, name: 'Empresa Renomeada', status: 'active' },
        user: { id: user.id, name: 'Nome Atualizado', email: 'login@empresa.com' },
        role: ['manager'],
      });

      // AD-014: suspender o tenant vale no request seguinte; sair continua
      // possível, para a tela de conta suspensa conseguir encerrar a sessão.
      await Tenant.findByIdAndUpdate(tenant._id, { status: 'suspended' });

      const suspendedRes = await request(app).get('/auth/session').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(suspendedRes.status).toBe(403);
      expect(suspendedRes.body.message).toBe('tenant_suspended');
      expect(suspendedRes.body.data).toBeUndefined();

      const signoutRes = await request(app).post('/auth/signout').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(signoutRes.status).toBe(200);
    });

    it('responds 401 without a valid session cookie', async () => {
      const res = await request(buildTestApp()).get('/auth/session').set('User-Agent', DEVICE);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/signout', () => {
    it('deletes the Session and clears the refreshToken cookie, revoking a later GET /auth/session', async () => {
      await seedUser();
      const app = buildTestApp();

      const signinRes = await request(app)
        .post('/auth/signin')
        .set('User-Agent', DEVICE)
        .send({ email: 'login@empresa.com', password: 'senhaCorreta123' });
      const cookie = (signinRes.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
      const rawToken = cookie.split('=')[1];

      const res = await request(app).post('/auth/signout').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: undefined, message: 'signed_out_successfully' });

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie?.[0]).toMatch(/refreshToken=;/);

      expect(await Session.findOne({ tokenHash: hashToken(rawToken) }).lean()).toBeNull();

      const sessionRes = await request(app).get('/auth/session').set('Cookie', cookie).set('User-Agent', DEVICE);
      expect(sessionRes.status).toBe(401);
    });

    it('responds 200 even without a session cookie (idempotent, always clears the cookie)', async () => {
      const res = await request(buildTestApp()).post('/auth/signout').set('User-Agent', DEVICE);

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie?.[0]).toMatch(/refreshToken=;/);
    });
  });

  // Diretório do tenant que alimenta o filtro de "responsável" da fila de
  // conversas (inbox) — mesmo canOperate já usado em GET /conversations.
  describe('GET /auth/users', () => {
    const randomId = (): string => crypto.randomBytes(12).toString('hex');

    it('responds 200 with {id,name} for every User of the tenant, sorted by name, never another tenant', async () => {
      const { tenant, user: loginUser } = await seedUser();
      const ana = await User.create({
        name: 'Ana',
        email: `ana-${randomId()}@empresa.com`,
        password: 'hash',
        Tenant: tenant._id,
        role: ['operator'],
      });
      const otherTenant = await Tenant.create({ name: 'Outra Empresa', document: '55555555000200', status: 'active' });
      await User.create({
        name: 'De Outro Tenant',
        email: `outro-${randomId()}@empresa.com`,
        password: 'hash',
        Tenant: otherTenant._id,
        role: ['operator'],
      });
      const app = buildTestApp();
      const cookie = await issueSessionCookie(loginUser.id);

      const res = await request(app).get('/auth/users').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { id: ana._id.toString(), name: 'Ana' },
        { id: loginUser.id, name: 'Usuária Login' },
      ]);
    });

    it('lists only active users with ?active=true and rejects unknown query keys', async () => {
      const { tenant, user: loginUser } = await seedUser({ role: ['operator'] });
      const inactive = await User.create({
        name: 'Ex Colaboradora',
        email: `ex-${randomId()}@empresa.com`,
        password: 'hash',
        Tenant: tenant._id,
        role: ['operator'],
        active: false,
      });
      const app = buildTestApp();
      const cookie = await issueSessionCookie(loginUser.id);

      const all = await request(app).get('/auth/users').set('Cookie', cookie).set('User-Agent', DEVICE);
      const activeOnly = await request(app)
        .get('/auth/users?active=true')
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE);
      const forged = await request(app)
        .get(`/auth/users?Tenant=${tenant.id}`)
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE);

      expect(all.body.data.map((u: { id: string }) => u.id)).toContain(inactive.id);
      expect(activeOnly.status).toBe(200);
      expect(activeOnly.body.data).toEqual([{ id: loginUser.id, name: 'Usuária Login' }]);
      expect(forged.status).toBe(400);
    });

    it('responds 403 for a caller without canOperate (no role), without returning any user data', async () => {
      const { user } = await seedUser({ role: [] });
      const app = buildTestApp();
      const cookie = await issueSessionCookie(user.id);

      const res = await request(app).get('/auth/users').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(res.status).toBe(403);
      expect(res.body.data).toBeUndefined();
    });

    it('responds 401 without a valid session cookie', async () => {
      const res = await request(buildTestApp()).get('/auth/users').set('User-Agent', DEVICE);

      expect(res.status).toBe(401);
    });
  });

  // REG-07 (AD-071): diretório da tela de usuários — e-mail, papel e situação,
  // só para admin; /auth/users continua {id,name} para qualquer operador.
  describe('GET /auth/users/directory', () => {
    const randomId = (): string => crypto.randomBytes(12).toString('hex');

    it('responds 200 to an admin with name, email, role and active of every User of the tenant, never the password', async () => {
      const { tenant, user: admin } = await seedUser({ role: ['admin'] });
      const ana = await User.create({
        name: 'Ana',
        email: `ana-${randomId()}@empresa.com`,
        password: 'hash',
        Tenant: tenant._id,
        role: ['operator'],
        active: false,
      });
      const otherTenant = await Tenant.create({ name: 'Outra Empresa', document: '55555555000200', status: 'active' });
      await User.create({
        name: 'De Outro Tenant',
        email: `outro-${randomId()}@empresa.com`,
        password: 'hash',
        Tenant: otherTenant._id,
        role: ['admin'],
      });
      const cookie = await issueSessionCookie(admin.id);

      const res = await request(buildTestApp())
        .get('/auth/users/directory')
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        {
          id: ana.id,
          name: 'Ana',
          email: ana.email,
          role: ['operator'],
          active: false,
          createdAt: ana.createdAt.toISOString(),
        },
        {
          id: admin.id,
          name: 'Usuária Login',
          email: 'login@empresa.com',
          role: ['admin'],
          active: true,
          createdAt: admin.createdAt.toISOString(),
        },
      ]);
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('responds 403 to a manager without returning any user data', async () => {
      const { user } = await seedUser({ role: ['manager'] });
      const cookie = await issueSessionCookie(user.id);

      const res = await request(buildTestApp())
        .get('/auth/users/directory')
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE);

      expect(res.status).toBe(403);
      expect(res.body.data).toBeUndefined();
    });

    it('rejects unknown query keys', async () => {
      const { tenant, user } = await seedUser({ role: ['admin'] });
      const cookie = await issueSessionCookie(user.id);

      const res = await request(buildTestApp())
        .get(`/auth/users/directory?Tenant=${tenant.id}`)
        .set('Cookie', cookie)
        .set('User-Agent', DEVICE);

      expect(res.status).toBe(400);
    });
  });
});
