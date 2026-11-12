import crypto from 'node:crypto';
import { ALL_PERMISSIONS, PROFILE_PERMISSIONS, type Role } from '@ethica/contracts';
import { AccessKey, connect, disconnect, hashToken, Passkey, Session, Tenant, User } from '@ethica/db';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.config.js';
import type { AuthDeps } from '../../middlewares/authentication.middleware.js';
import { createAuthMiddleware } from '../../middlewares/authentication.middleware.js';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import { createAuthRouter } from './auth.router.js';

// The WebAuthn ceremony needs a real authenticator: the library is replaced by a stand-in that
// accepts any credential id except 'forged' and echoes it back.
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: async () => ({ challenge: 'register-challenge' }),
  generateAuthenticationOptions: async () => ({ challenge: 'signin-challenge' }),
  verifyRegistrationResponse: async ({ response }: { response: { id: string } }) =>
    response.id === 'forged'
      ? { verified: false }
      : {
          verified: true,
          registrationInfo: {
            credential: { id: response.id, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] },
            credentialBackedUp: true,
          },
        },
  verifyAuthenticationResponse: async ({ response }: { response: { id: string } }) => ({
    verified: response.id !== 'forged',
    authenticationInfo: { newCounter: 1 },
  }),
}));

const credential = (id: string) => ({
  id,
  rawId: id,
  type: 'public-key',
  authenticatorAttachment: 'platform',
  response: {},
});

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

// Captures the access key e-mails (AD-155): code in the subject, token in the button link.
const sentMails: Array<{ to: string; subject: string; body: string }> = [];
const mailProvider = {
  send: async (to: string, subject: string, body: string) => {
    sentMails.push({ to, subject, body });
    return { sent: true };
  },
};
const lastKey = () => {
  const mail = sentMails.at(-1) as { subject: string; body: string };
  return {
    code: (mail.subject.match(/(\d{6})$/) as RegExpMatchArray)[1] as string,
    token: (mail.body.match(/token=([a-f0-9]{64})/) as RegExpMatchArray)[1] as string,
  };
};

const buildTestApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const { validToken } = createAuthMiddleware(buildAuthDeps());
  app.use('/auth', createAuthRouter({ validToken, mailProvider, accessUrl: 'http://web.test/auth' }));
  app.use(errorHandler);
  return app;
};

const DEVICE = 'test-agent';

describe('auth routes', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    sentMails.length = 0;
    await Promise.all([
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
      AccessKey.deleteMany({}),
      Passkey.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnect();
  });

  const seedUser = async (overrides: { active?: boolean; role?: Role[] } = {}) => {
    const tenant = await Tenant.create({ name: 'Empresa Login', document: '55555555000155', status: 'active' });
    const user = await User.create({
      name: 'Usuária Login',
      email: 'login@empresa.com',
      Tenant: tenant._id,
      role: overrides.role ?? ['manager'],
      active: overrides.active ?? true,
    });
    return { tenant, user };
  };

  // Most routes do not need the real access key flow (and spend its budget of
  // 5 requests/15min, accessKeyRateLimit) — same
  // issueSessionCookie shortcut as in conversation.router.e2e.test.ts, which
  // writes the Session directly and signs the JWT with the same secret/shape.
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

  // APA-03 (AD-220): the key (or the new office) hands over the passkey ticket; the passkey of this
  // device opens the session.
  const createPasskey = async (
    app: ReturnType<typeof buildTestApp>,
    passkeyToken: string,
    id = 'cred-1',
    agent = DEVICE,
  ) => {
    const options = await request(app).post('/auth/passkey/register/options').send({ passkeyToken });
    expect(options.status).toBe(200);
    expect(options.body.data.options.challenge).toBe('register-challenge');
    return request(app)
      .post('/auth/passkey/register')
      .set('User-Agent', agent)
      .send({ challengeToken: options.body.data.challengeToken, response: credential(id) });
  };
  const cookieOf = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

  describe('access by e-mail key (AD-155) and passkey of the device (AD-220)', () => {
    it('the link leads to the passkey, which opens the session once (ACE-01/03, APA-03)', async () => {
      const { user } = await seedUser();
      const app = buildTestApp();

      const sent = await request(app).post('/auth/access-key').send({ email: 'Login@Empresa.com' });
      expect(sent.status).toBe(200);
      expect(sent.body.message).toBe('access_key_sent');
      expect(sentMails[0]?.to).toBe('login@empresa.com');
      expect(sentMails[0]?.body).toContain('http://web.test/auth?token=');

      const { token } = lastKey();
      const res = await request(app).post('/auth/access-key/verify').send({ token });
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(await Session.countDocuments({})).toBe(0);

      const registered = await createPasskey(app, res.body.data.passkeyToken);
      expect(registered.status).toBe(200);
      const setCookie = registered.headers['set-cookie'] as unknown as string[];
      expect(setCookie?.[0]).toMatch(/HttpOnly/i);
      const rawToken = setCookie[0].split(';')[0].split('=')[1];
      const session = await Session.findOne({ tokenHash: hashToken(rawToken) }).lean();
      const passkey = await Passkey.findOne({ credentialId: 'cred-1' }).lean();
      expect(session?.user.toString()).toBe(user.id);
      expect(session?.deviceInfo).toBe(DEVICE);
      expect(session?.passkey?.toString()).toBe(passkey?._id.toString());
      expect(passkey).toMatchObject({ kind: 'desktop', backedUp: true });

      const again = await request(app).post('/auth/access-key/verify').send({ token });
      expect(again.status).toBe(401);
      expect(again.body.message).toBe('invalid_access_key');
    });

    it('the code works too, and GET /auth/session right after never 401s (Risk 5)', async () => {
      await seedUser();
      const app = buildTestApp();

      await request(app).post('/auth/access-key').send({ email: 'login@empresa.com' });
      const res = await request(app)
        .post('/auth/access-key/verify')
        .send({ email: 'login@empresa.com', code: lastKey().code });
      const registered = await createPasskey(app, res.body.data.passkeyToken);

      const sessionRes = await request(app)
        .get('/auth/session')
        .set('Cookie', cookieOf(registered))
        .set('User-Agent', DEVICE);
      expect(sessionRes.status).toBe(200);
    });

    it('rejects a forged passkey ticket, a forged credential and a security key (APA-06)', async () => {
      const { user } = await seedUser();
      const app = buildTestApp();

      const forgedTicket = await request(app)
        .post('/auth/passkey/register/options')
        .send({ passkeyToken: jwt.sign({ user: user.id, purpose: 'passkey' }, 'outro') });
      expect(forgedTicket.status).toBe(401);
      expect(forgedTicket.body.message).toBe('invalid_passkey');

      const passkeyToken = jwt.sign({ user: user.id, purpose: 'passkey' }, env.SESSION_JWT_SECRET);
      const forged = await createPasskey(app, passkeyToken, 'forged');
      expect(forged.status).toBe(401);

      const options = await request(app).post('/auth/passkey/register/options').send({ passkeyToken });
      const usbKey = await request(app)
        .post('/auth/passkey/register')
        .send({
          challengeToken: options.body.data.challengeToken,
          response: { ...credential('usb'), authenticatorAttachment: 'cross-platform' },
        });
      expect(usbKey.status).toBe(401);
      expect(await Passkey.countDocuments({})).toBe(0);
    });

    it('one computer + one phone: a new computer replaces the old one and ends its sessions (APA-05)', async () => {
      const { user } = await seedUser();
      const app = buildTestApp();
      const passkeyToken = jwt.sign({ user: user.id, purpose: 'passkey' }, env.SESSION_JWT_SECRET);
      const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile Safari';

      const oldComputer = cookieOf(await createPasskey(app, passkeyToken, 'cred-old'));
      const phone = cookieOf(await createPasskey(app, passkeyToken, 'cred-phone', PHONE));
      const newComputer = cookieOf(await createPasskey(app, passkeyToken, 'cred-new'));

      const kinds = await Passkey.find({ user: user.id }).sort({ kind: 1 }).lean();
      expect(kinds.map((passkey) => [passkey.kind, passkey.credentialId])).toEqual([
        ['desktop', 'cred-new'],
        ['mobile', 'cred-phone'],
      ]);
      expect(
        (await request(app).get('/auth/session').set('Cookie', oldComputer).set('User-Agent', DEVICE)).status,
      ).toBe(401);
      expect((await request(app).get('/auth/session').set('Cookie', phone).set('User-Agent', PHONE)).status).toBe(200);
      expect(
        (await request(app).get('/auth/session').set('Cookie', newComputer).set('User-Agent', DEVICE)).status,
      ).toBe(200);
    });

    it('signs in with the passkey alone, without e-mail (APA-02); deactivated or unknown gets 401', async () => {
      const { user } = await seedUser();
      const app = buildTestApp();
      const passkeyToken = jwt.sign({ user: user.id, purpose: 'passkey' }, env.SESSION_JWT_SECRET);
      await createPasskey(app, passkeyToken);
      await Session.deleteMany({});

      const signin = async (id: string) => {
        const options = await request(app).post('/auth/passkey/options');
        expect(options.body.data.options.challenge).toBe('signin-challenge');
        return request(app)
          .post('/auth/passkey')
          .set('User-Agent', DEVICE)
          .send({ challengeToken: options.body.data.challengeToken, response: credential(id) });
      };

      const res = await signin('cred-1');
      expect(res.status).toBe(200);
      expect(
        (await request(app).get('/auth/session').set('Cookie', cookieOf(res)).set('User-Agent', DEVICE)).status,
      ).toBe(200);
      expect((await Passkey.findOne({ credentialId: 'cred-1' }).lean())?.counter).toBe(1);

      expect((await signin('unknown')).status).toBe(401);
      await User.updateOne({ _id: user.id }, { $set: { active: false } });
      expect((await signin('cred-1')).status).toBe(401);
    });

    it('discards the key after 5 wrong codes, even if the right one comes next (ACE-02)', async () => {
      await seedUser();
      const app = buildTestApp();

      await request(app).post('/auth/access-key').send({ email: 'login@empresa.com' });
      const { code } = lastKey();
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/auth/access-key/verify')
          .send({ email: 'login@empresa.com', code: wrong });
        expect(res.status).toBe(401);
      }
      const right = await request(app).post('/auth/access-key/verify').send({ email: 'login@empresa.com', code });
      expect(right.status).toBe(401);
    });

    it('answers the same for a deactivated account but sends nothing (ACE-01)', async () => {
      await seedUser({ active: false });

      const res = await request(buildTestApp()).post('/auth/access-key').send({ email: 'login@empresa.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('access_key_sent');
      expect(sentMails).toHaveLength(0);
    });

    it('a new e-mail creates its own active office as admin, then the passkey (ACE-04, APA-04)', async () => {
      const app = buildTestApp();

      await request(app).post('/auth/access-key').send({ email: 'nova@perita.com' });
      const verified = await request(app)
        .post('/auth/access-key/verify')
        .send({ email: 'nova@perita.com', code: lastKey().code });
      expect(verified.status).toBe(200);
      const { signupToken } = verified.body.data as { signupToken: string };

      const res = await request(app)
        .post('/auth/signup')
        .send({ signupToken, name: 'Nova Perita', officeName: 'Perícias Nova', document: '11.222.333/0001-81' });
      expect(res.status).toBe(201);
      expect(res.headers['set-cookie']).toBeUndefined();
      const registered = await createPasskey(app, res.body.data.passkeyToken);

      const session = await request(app)
        .get('/auth/session')
        .set('Cookie', cookieOf(registered))
        .set('User-Agent', DEVICE);
      expect(session.body.data.tenant).toMatchObject({ name: 'Perícias Nova', status: 'active' });
      expect(session.body.data.user).toMatchObject({ name: 'Nova Perita', email: 'nova@perita.com' });
      expect(session.body.data.role).toEqual(['admin']);

      const twice = await request(app)
        .post('/auth/signup')
        .send({ signupToken, name: 'Nova Perita', officeName: 'Outro', document: '44555666000177' });
      expect(twice.status).toBe(409);
      expect(twice.body.message).toBe('email_already_registered');
    });

    it('rejects a forged sign-up ticket and a document already in use', async () => {
      await seedUser();
      const app = buildTestApp();
      const base = { name: 'Alguém', officeName: 'Escritório' };

      const forged = await request(app)
        .post('/auth/signup')
        .send({
          ...base,
          signupToken: jwt.sign({ email: 'x@y.com', purpose: 'signup' }, 'outro'),
          document: '44555666000177',
        });
      expect(forged.status).toBe(401);

      const signupToken = jwt.sign({ email: 'x@y.com', purpose: 'signup' }, env.SESSION_JWT_SECRET);
      const taken = await request(app)
        .post('/auth/signup')
        .send({ ...base, signupToken, document: '55555555000155' });
      expect(taken.status).toBe(409);
      expect(taken.body.message).toBe('document_already_registered');
    });
  });

  describe('GET /auth/session', () => {
    it("returns {tenant,user,role} read from the database — a live update to the user's name/tenant is reflected, and a suspended tenant gets 403 (FND-05, AD-014)", async () => {
      const { tenant, user } = await seedUser();
      const app = buildTestApp();
      const cookie = await issueSessionCookie(user.id);

      // Changes the state in the database AFTER the session is issued — if the response
      // came from the token payload (or from something cached), the old value
      // would show up; coming from the database, it reflects the change.
      await User.findByIdAndUpdate(user._id, { name: 'Nome Atualizado' });
      await Tenant.findByIdAndUpdate(tenant._id, { name: 'Empresa Renomeada' });

      const res = await request(app).get('/auth/session').set('Cookie', cookie).set('User-Agent', DEVICE);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        tenant: { id: tenant.id, name: 'Empresa Renomeada', status: 'active' },
        user: { id: user.id, name: 'Nome Atualizado', email: 'login@empresa.com' },
        role: ['manager'],
        permissions: PROFILE_PERMISSIONS.manager,
      });

      // AD-014: suspending the tenant applies on the next request; signing out stays
      // possible, so the suspended account screen can end the session.
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
      const { user } = await seedUser();
      const app = buildTestApp();
      const cookie = await issueSessionCookie(user.id);
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

  // Tenant directory that feeds the "assignee" filter of the conversation
  // queue (inbox) — same canOperate already used in GET /conversations.
  describe('GET /auth/users', () => {
    const randomId = (): string => crypto.randomBytes(12).toString('hex');

    it('responds 200 with {id,name} for every User of the tenant, sorted by name, never another tenant', async () => {
      const { tenant, user: loginUser } = await seedUser();
      const ana = await User.create({
        name: 'Ana',
        email: `ana-${randomId()}@empresa.com`,
        Tenant: tenant._id,
        role: ['operator'],
      });
      const otherTenant = await Tenant.create({ name: 'Outra Empresa', document: '55555555000200', status: 'active' });
      await User.create({
        name: 'De Outro Tenant',
        email: `other-${randomId()}@empresa.com`,
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

  // REG-07 (AD-071): users screen directory — e-mail, role and state,
  // admin only; /auth/users stays {id,name} for any operator.
  describe('GET /auth/users/directory', () => {
    const randomId = (): string => crypto.randomBytes(12).toString('hex');

    it('responds 200 to an admin with name, email, role and active of every User of the tenant, never a password', async () => {
      const { tenant, user: admin } = await seedUser({ role: ['admin'] });
      const ana = await User.create({
        name: 'Ana',
        email: `ana-${randomId()}@empresa.com`,
        Tenant: tenant._id,
        role: ['operator'],
        active: false,
      });
      const otherTenant = await Tenant.create({ name: 'Outra Empresa', document: '55555555000200', status: 'active' });
      await User.create({
        name: 'De Outro Tenant',
        email: `other-${randomId()}@empresa.com`,
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
          permissions: PROFILE_PERMISSIONS.operator,
          active: false,
          createdAt: ana.createdAt.toISOString(),
        },
        {
          id: admin.id,
          name: 'Usuária Login',
          email: 'login@empresa.com',
          role: ['admin'],
          permissions: ALL_PERMISSIONS,
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

  const randomId = (): string => crypto.randomBytes(12).toString('hex');

  // AD-137: per-member matrix, only the admin adjusts it; applies on the next request.
  describe('PATCH /auth/users/:id/permissoes', () => {
    it('grava a matriz do membro e a sessão dele passa a refleti-la', async () => {
      const { tenant, user: admin } = await seedUser({ role: ['admin'] });
      const member = await User.create({
        name: 'Secretária',
        email: `sec-${randomId()}@empresa.com`,
        Tenant: tenant._id,
        role: ['operator'],
      });
      const app = buildTestApp();
      const adminCookie = await issueSessionCookie(admin.id);
      const permissions = { agenda: ['view', 'create'], finance: ['view'] };

      const res = await request(app)
        .patch(`/auth/users/${member.id}/permissions`)
        .set('Cookie', adminCookie)
        .set('User-Agent', DEVICE)
        .send({ permissions });
      expect(res.status).toBe(200);

      const session = await request(app)
        .get('/auth/session')
        .set('Cookie', await issueSessionCookie(member.id))
        .set('User-Agent', DEVICE);
      expect(session.body.data.permissions).toEqual(permissions);
    });

    it('recusa ajustar o admin (422), quem não é admin (403) e ação sem ver (400)', async () => {
      const { tenant, user: admin } = await seedUser({ role: ['admin'] });
      const manager = await User.create({
        name: 'Gestor',
        email: `g-${randomId()}@empresa.com`,
        Tenant: tenant._id,
        role: ['manager'],
      });
      const app = buildTestApp();
      const adminCookie = await issueSessionCookie(admin.id);

      const self = await request(app)
        .patch(`/auth/users/${admin.id}/permissions`)
        .set('Cookie', adminCookie)
        .set('User-Agent', DEVICE)
        .send({ permissions: {} });
      expect(self.status).toBe(422);

      const byManager = await request(app)
        .patch(`/auth/users/${manager.id}/permissions`)
        .set('Cookie', await issueSessionCookie(manager.id))
        .set('User-Agent', DEVICE)
        .send({ permissions: {} });
      expect(byManager.status).toBe(403);

      const invalid = await request(app)
        .patch(`/auth/users/${manager.id}/permissions`)
        .set('Cookie', adminCookie)
        .set('User-Agent', DEVICE)
        .send({ permissions: { expert_cases: ['delete'] } });
      expect(invalid.status).toBe(400);
      expect((await User.findById(manager.id).lean())?.permissions).toBeUndefined();
    });
  });
});
