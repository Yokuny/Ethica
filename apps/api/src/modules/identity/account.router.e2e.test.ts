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
import { createAccountRouter } from './account.router.js';
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
  app.use('/auth', createAuthRouter({ validToken }));
  app.use('/me', createAccountRouter({ validToken }));
  app.use(errorHandler);
  return app;
};

const DEVICE = 'test-agent';
// PNG 1×1 transparente.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;

describe('account routes (ACC-02..06)', () => {
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
      email: `conta-${counter}@empresa.com`,
      password: await bcrypt.hash('senha-antiga', 4),
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

  it('PATCH /me/profile renames only the caller and rejects names out of range', async () => {
    const { user } = await seedUser('77777777000101');
    const other = await seedUser('77777777000102');
    const app = buildTestApp();
    const cookie = await cookieFor(user.id);

    const res = await request(app)
      .patch('/me/profile')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ name: '  Ana Souza  ' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ name: 'Ana Souza' });
    expect((await User.findById(other.user.id).lean())?.name).toBe(other.user.name);

    for (const body of [{ name: 'Al' }, { name: 'Ana', Tenant: other.tenant.id }, {}]) {
      const bad = await request(app).patch('/me/profile').set('Cookie', cookie).set('User-Agent', DEVICE).send(body);
      expect(bad.status).toBe(400);
    }
  });

  it('GET/PATCH /me/profile keeps professional data (DOC-01) and clears an empty field', async () => {
    const { user } = await seedUser('77777777000109');
    const app = buildTestApp();
    const cookie = await cookieFor(user.id);
    const saved = await request(app).patch('/me/profile').set('Cookie', cookie).set('User-Agent', DEVICE).send({
      name: 'Ana Souza',
      cpf: '123.456.789-09',
      registroProfissional: 'CREA-SP 123',
      formacao: 'Eng. Segurança',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toEqual({
      name: 'Ana Souza',
      cpf: '12345678909',
      registroProfissional: 'CREA-SP 123',
      formacao: 'Eng. Segurança',
    });

    const cleared = await request(app)
      .patch('/me/profile')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ name: 'Ana Souza', formacao: '' });
    expect(cleared.body.data).toEqual({ name: 'Ana Souza', cpf: '12345678909', registroProfissional: 'CREA-SP 123' });

    const read = await request(app).get('/me/profile').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(read.body.data).toEqual(cleared.body.data);

    const badCpf = await request(app)
      .patch('/me/profile')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ name: 'Ana Souza', cpf: '123' });
    expect(badCpf.status).toBe(400);
  });

  it('PUT /me/password checks the current password and ends the other sessions only', async () => {
    const { user } = await seedUser('77777777000103');
    const app = buildTestApp();
    const current = await cookieFor(user.id);
    const elsewhere = await cookieFor(user.id);

    const wrong = await request(app)
      .put('/me/password')
      .set('Cookie', current)
      .set('User-Agent', DEVICE)
      .send({ currentPassword: 'errada', newPassword: 'senha-nova-123' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('wrong_current_password');

    const short = await request(app)
      .put('/me/password')
      .set('Cookie', current)
      .set('User-Agent', DEVICE)
      .send({ currentPassword: 'senha-antiga', newPassword: 'curta' });
    expect(short.status).toBe(400);

    const ok = await request(app)
      .put('/me/password')
      .set('Cookie', current)
      .set('User-Agent', DEVICE)
      .send({ currentPassword: 'senha-antiga', newPassword: 'senha-nova-123' });
    expect(ok.status).toBe(200);

    const stored = await User.findById(user.id).lean();
    expect(await bcrypt.compare('senha-nova-123', stored?.password as string)).toBe(true);
    expect((await request(app).get('/auth/session').set('Cookie', current).set('User-Agent', DEVICE)).status).toBe(200);
    expect((await request(app).get('/auth/session').set('Cookie', elsewhere).set('User-Agent', DEVICE)).status).toBe(
      401,
    );
  });

  it('PUT/DELETE /me/avatar stores the photo, exposes a versioned path and serves the bytes to the same tenant only', async () => {
    const { user } = await seedUser('77777777000104');
    const teammate = await User.create({
      name: 'Colega',
      email: 'colega@empresa.com',
      password: 'hash',
      Tenant: user.Tenant,
      role: ['operator'],
    });
    const outsider = await seedUser('77777777000105');
    const app = buildTestApp();
    const cookie = await cookieFor(user.id);

    const saved = await request(app)
      .put('/me/avatar')
      .set('Cookie', cookie)
      .set('User-Agent', DEVICE)
      .send({ image: PNG_DATA_URL });
    expect(saved.status).toBe(200);
    const avatar = saved.body.data.avatar as string;
    expect(avatar).toMatch(new RegExp(`^/auth/users/${user.id}/avatar\\?v=\\d+$`));

    // A foto nunca vem nas listas; só o caminho.
    const users = await request(app).get('/auth/users').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(users.body.data).toContainEqual({ id: user.id, name: user.name, avatar });
    expect(users.body.data).toContainEqual({ id: teammate.id, name: 'Colega' });
    const session = await request(app).get('/auth/session').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(session.body.data.user.avatar).toBe(avatar);

    const teammateCookie = await cookieFor(teammate.id);
    const image = await request(app).get(avatar).set('Cookie', teammateCookie).set('User-Agent', DEVICE);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toBe('image/png');
    expect(image.headers['cache-control']).toContain('immutable');
    expect(Buffer.from(image.body).toString('base64')).toBe(PNG_BASE64);

    const foreign = await request(app)
      .get(avatar)
      .set('Cookie', await cookieFor(outsider.user.id))
      .set('User-Agent', DEVICE);
    expect(foreign.status).toBe(404);

    for (const body of [
      { image: 'data:text/html;base64,PGgxPg==' },
      { image: `data:image/png;base64,${'A'.repeat(100_001)}` },
    ]) {
      const bad = await request(app).put('/me/avatar').set('Cookie', cookie).set('User-Agent', DEVICE).send(body);
      expect(bad.status).toBe(400);
    }

    const removed = await request(app).delete('/me/avatar').set('Cookie', cookie).set('User-Agent', DEVICE);
    expect(removed.body.data).toEqual({ name: user.name });
    expect((await request(app).get(avatar).set('Cookie', cookie).set('User-Agent', DEVICE)).status).toBe(404);
  });

  it('responds 401 without a session', async () => {
    const app = buildTestApp();
    expect((await request(app).patch('/me/profile').send({ name: 'Ana Souza' })).status).toBe(401);
    expect((await request(app).put('/me/avatar').send({ image: PNG_DATA_URL })).status).toBe(401);
  });
});
