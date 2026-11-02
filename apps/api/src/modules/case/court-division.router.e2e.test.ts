import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import { CourtDivision, connect, disconnect, hashToken, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();

let counter = 0;
const seedSession = async (role: Role[], tenantId?: TenantDocument['_id']) => {
  counter += 1;
  const tenant =
    tenantId ??
    (
      await Tenant.create({
        name: `Escritório ${counter}`,
        document: `5555555500${String(counter).padStart(4, '0')}`,
        status: 'active',
      })
    )._id;
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `vara-${counter}@x.com`,
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
  return { tenant, as };
};

const DIVISION = {
  courtType: 'labor',
  name: '1ª Vara do Trabalho de São Paulo',
  court: 'TRT2',
  state: 'SP',
  city: 'São Paulo',
  phones: '(11) 3000-0000',
  email: 'vt01sp@trt2.jus.br',
  virtualDesk: 'https://trt2.jus.br/balcao',
};

describe('contatos das varas (VAR-01, VAR-02, AD-151)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
    await CourtDivision.createIndexes();
  });
  afterEach(async () => {
    await Promise.all([
      CourtDivision.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('admin cadastra, filtra por estado e cidade sem acento, edita, apaga; repetida é 409; operador só vê', async () => {
    const admin = await seedSession(['admin']);
    const operator = await seedSession(['operator'], admin.tenant);
    const created = await admin.as(request(app).post('/court-divisions')).send(DIVISION);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    await admin
      .as(request(app).post('/court-divisions'))
      .send({ ...DIVISION, courtType: 'civil', name: '2ª Vara Cível', court: '' })
      .expect(201);
    await admin
      .as(request(app).post('/court-divisions'))
      .send({ ...DIVISION, state: 'RJ', city: 'Rio de Janeiro' })
      .expect(201);

    const duplicated = await admin
      .as(request(app).post('/court-divisions'))
      .send({ ...DIVISION, name: '1ª VARA DO TRABALHO DE SAO PAULO', city: 'sao paulo' });
    expect(duplicated.status).toBe(409);
    expect(duplicated.body.message).toBe('already_exists');

    const sp = await operator.as(request(app).get('/court-divisions?state=SP&city=sao%20paulo'));
    expect(sp.body.data.map((item: { name: string }) => item.name)).toEqual([
      '1ª Vara do Trabalho de São Paulo',
      '2ª Vara Cível',
    ]);
    const labor = await operator.as(request(app).get('/court-divisions?state=SP&courtType=labor'));
    expect(labor.body.data).toHaveLength(1);
    expect((await operator.as(request(app).get('/court-divisions/cities?state=SP'))).body.data).toEqual(['São Paulo']);

    await operator
      .as(request(app).post('/court-divisions'))
      .send({ ...DIVISION, name: 'Outra' })
      .expect(403);
    await operator
      .as(request(app).patch(`/court-divisions/${id}`))
      .send({ phones: '1' })
      .expect(403);

    const edited = await admin
      .as(request(app).patch(`/court-divisions/${id}`))
      .send({ phones: '(11) 3111-1111', email: '' });
    expect(edited.body.data.phones).toBe('(11) 3111-1111');
    expect(edited.body.data).not.toHaveProperty('email');

    const other = await seedSession(['admin']);
    await other.as(request(app).delete(`/court-divisions/${id}`)).expect(404);
    await admin.as(request(app).delete(`/court-divisions/${id}`)).expect(200);
  });

  it('planilha: cria, ignora a já cadastrada e recusa a linha inválida com a coluna', async () => {
    const admin = await seedSession(['admin']);
    await admin.as(request(app).post('/court-divisions')).send(DIVISION).expect(201);
    const csv = [
      'justica;vara;tribunal;uf;cidade;telefones;email',
      'trabalho;1ª Vara do Trabalho de São Paulo;TRT2;SP;São Paulo;;',
      'cível;3ª Vara Cível;TJSP;sp;Campinas;(19) 3000-0000;',
      'trabalho;Vara sem UF;TRT2;XX;Santos;;',
    ].join('\n');
    const result = await admin
      .as(request(app).post('/court-divisions/import'))
      .set('Content-Type', 'text/csv')
      .send(csv);
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      created: 1,
      skipped: [{ line: 2, name: '1ª Vara do Trabalho de São Paulo' }],
      rejected: [{ line: 4, column: 'uf', reason: 'invalid_data' }],
    });
    const header = await admin
      .as(request(app).post('/court-divisions/import'))
      .set('Content-Type', 'text/csv')
      .send('vara;cidade\nX;Y');
    expect(header.status).toBe(400);
    expect(header.body.message).toBe('csv_invalid_header');
  });
});
