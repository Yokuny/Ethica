import crypto from 'node:crypto';
import { type Role, TENANT_STORAGE_QUOTA_BYTES } from '@ethica/contracts';
import { connect, disconnect, hashToken, Session, Tenant, type TenantDocument, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfDocument } from '../../providers/pdfRenderer.js';

const DEVICE = 'test-agent';
const objects = new Map<string, Buffer>();
const storage: FileStorage = {
  put: async (key, body) => {
    objects.set(key, body);
  },
  get: async (key) => objects.get(key) ?? null,
  remove: async (key) => {
    objects.delete(key);
  },
};
let rendered: PdfDocument | undefined;
const pdf = {
  render: async (document: PdfDocument) => {
    rendered = document;
    return Buffer.from('%PDF');
  },
};
const app = buildApp({ pdf, storage });
const appSemStorage = buildApp({ pdf, storage: null });

// PNG 1×1 transparente.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let counter = 0;
const seedSession = async (role: Role[], tenantId?: TenantDocument['_id']) => {
  counter += 1;
  const tenant =
    tenantId ??
    (
      await Tenant.create({
        name: `Escritório ${counter}`,
        document: `6666666600${String(counter).padStart(4, '0')}`,
        status: 'active',
      })
    )._id;
  const user = await User.create({
    name: `Pessoa ${counter}`,
    email: `office-${counter}@x.com`,
    password: 'hash',
    Tenant: tenant,
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

describe('identidade do escritório (DOC-01)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    objects.clear();
    rendered = undefined;
    await Promise.all([Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('só admin lê e edita; texto vazio volta ao padrão; os marcadores chegam ao PDF', async () => {
    const admin = await seedSession(['admin']);
    const manager = await seedSession(['manager'], admin.tenant);
    expect((await manager.as(request(app).get('/tenant/office'))).status).toBe(403);

    const saved = await admin
      .as(request(app).put('/tenant/office'))
      .send({ cabecalho: 'Laudos [NOME_PERITO]', rodape: 'Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]' });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ cabecalho: 'Laudos [NOME_PERITO]', storageBytes: 0 });

    await admin.as(request(app).get('/documentos/prazos'));
    expect(rendered?.headerTemplate).toContain(`Laudos ${admin.user.name}`);

    const cleared = await admin.as(request(app).put('/tenant/office')).send({ cabecalho: '', rodape: '' });
    expect(cleared.body.data).toMatchObject({ cabecalho: '', rodape: '' });
    expect((await Tenant.findById(admin.tenant).lean())?.cabecalho).toBeUndefined();
  });

  it('logo PNG vai para o storage, conta na cota, troca apaga o anterior e entra no cabeçalho', async () => {
    const admin = await seedSession(['admin']);
    const first = await admin.as(request(app).post('/tenant/office/logo')).set('Content-Type', 'image/png').send(PNG);
    expect(first.status).toBe(200);
    expect(first.body.data.logo).toMatch(/^\/tenant\/office\/logo\?v=\d+$/);
    expect(first.body.data.storageBytes).toBe(PNG.length);
    expect(objects.size).toBe(1);

    const second = await admin.as(request(app).post('/tenant/office/logo')).set('Content-Type', 'image/png').send(PNG);
    expect(second.body.data.storageBytes).toBe(PNG.length);
    expect(objects.size).toBe(1);

    const logo = await admin.as(request(app).get('/tenant/office/logo'));
    expect(logo.status).toBe(200);
    expect(logo.headers['content-type']).toBe('image/png');

    await admin.as(request(app).get('/documentos/prazos'));
    expect(rendered?.headerTemplate).toContain('<img src="data:image/png;base64,');

    const removed = await admin.as(request(app).delete('/tenant/office/logo'));
    expect(removed.body.data).not.toHaveProperty('logo');
    expect(removed.body.data.storageBytes).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('recusa arquivo que não é PNG, cota estourada e storage não configurado', async () => {
    const admin = await seedSession(['admin']);
    const notPng = await admin
      .as(request(app).post('/tenant/office/logo'))
      .set('Content-Type', 'image/png')
      .send(Buffer.from('not a png'));
    expect(notPng.status).toBe(415);
    expect(
      (await admin.as(request(app).post('/tenant/office/logo')).set('Content-Type', 'image/jpeg').send(PNG)).status,
    ).toBe(415);

    await Tenant.updateOne({ _id: admin.tenant }, { storageBytes: TENANT_STORAGE_QUOTA_BYTES - 10 });
    const full = await admin.as(request(app).post('/tenant/office/logo')).set('Content-Type', 'image/png').send(PNG);
    expect(full.status).toBe(422);
    expect(full.body.message).toBe('storage_quota_exceeded');
    expect(objects.size).toBe(0);

    const off = await admin
      .as(request(appSemStorage).post('/tenant/office/logo'))
      .set('Content-Type', 'image/png')
      .send(PNG);
    expect(off.status).toBe(503);
    expect(off.body.message).toBe('storage_not_configured');
  });
});
