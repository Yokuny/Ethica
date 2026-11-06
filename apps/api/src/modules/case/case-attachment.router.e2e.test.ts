import crypto from 'node:crypto';
import { Case, connect, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';
import type { FileStorage } from '../../providers/fileStorage.js';

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
const app = buildApp({ storage });
const PDF = Buffer.from('%PDF-1.7 test');

let counter = 0;
const seedSession = async () => {
  counter += 1;
  const tenant = await Tenant.create({
    name: `Escritório ${counter}`,
    document: `8888888800${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `attachment-${counter}@x.com`,
    Tenant: tenant._id,
    role: ['admin'],
  });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { tenant, as };
};

const CASE = {
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
  nominationDate: '2026-11-01',
};

describe('link da pasta e anexos do serviço (SPA)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    objects.clear();
    await Promise.all([Case.deleteMany({}), Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('o link da pasta aceita http(s), recusa o resto e pode ser apagado (SPA-01)', async () => {
    const { as } = await seedSession();
    const url = 'https://drive.google.com/drive/folders/abc';
    const created = await as(request(app).post('/expert-cases')).send({ ...CASE, folderUrl: url });
    expect(created.body.data.folderUrl).toBe(url);
    const patch = (body: object) => as(request(app).patch(`/expert-cases/${created.body.data.id}`)).send(body);
    expect((await patch({ folderUrl: 'javascript:alert(1)' })).status).toBe(400);
    const cleared = await patch({ folderUrl: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.folderUrl).toBeUndefined();
  });

  it('anexa, baixa e remove, com a cota acompanhando (SPA-03 a 05)', async () => {
    const { as, tenant } = await seedSession();
    const { id } = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    const send = (type: string) =>
      as(request(app).post(`/expert-cases/${id}/attachments?name=${encodeURIComponent('Ação.pdf')}`))
        .set('Content-Type', type)
        .send(PDF);

    expect((await send('text/html')).status).toBe(415);
    const added = await send('application/pdf');
    expect(added.status).toBe(201);
    const [attachment] = added.body.data.attachments;
    expect(attachment).toMatchObject({ name: 'Ação.pdf', mime: 'application/pdf', bytes: PDF.length });
    expect(attachment).not.toHaveProperty('key');
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(PDF.length);

    const path = `/expert-cases/${id}/attachments/${attachment.id}`;
    const file = await as(request(app).get(path)).buffer(true);
    expect(file.status).toBe(200);
    expect(file.headers['content-disposition']).toMatch(/^attachment/);

    expect((await as(request(app).delete(path))).status).toBe(200);
    expect((await as(request(app).get(path))).status).toBe(404);
    expect(objects.size).toBe(0);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(0);
  });

  it('excluir o serviço leva os anexos e devolve a cota; outro escritório não alcança (SPA-05, SPA-06)', async () => {
    const { as, tenant } = await seedSession();
    const other = await seedSession();
    const { id } = (await as(request(app).post('/expert-cases')).send(CASE)).body.data;
    const added = await as(request(app).post(`/expert-cases/${id}/attachments?name=a.pdf`))
      .set('Content-Type', 'application/pdf')
      .send(PDF);
    const path = `/expert-cases/${id}/attachments/${added.body.data.attachments[0].id}`;

    expect((await other.as(request(app).get(path))).status).toBe(404);

    expect((await as(request(app).delete(`/expert-cases/${id}`))).status).toBe(200);
    expect(objects.size).toBe(0);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(0);
  });
});
