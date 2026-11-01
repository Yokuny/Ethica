import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { Case, connect, Deadline, disconnect, hashToken, Party, Session, Tenant, User } from '@ethica/db';
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
    document: `6666666600${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `party-${counter}@x.com`,
    password: 'hash',
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

const legalCase = (processNumber: string, extra: object = {}) => ({
  processNumber,
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
  ...extra,
});

describe('partes e advogados (IMP-03) e dados trabalhistas (IMP-04)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Party.deleteMany({}),
      Deadline.deleteMany({}),
      Case.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('cadastrar a perícia cria as partes novas e reaproveita por documento, OAB e nome exato (IMP-01.4, AD-115)', async () => {
    const { as } = await seedSession();
    const primeira = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        parties: [
          { side: 'plaintiff', tipo: 'party', nome: 'Maria  da Silva', documento: '123.456.789-09' },
          { side: 'plaintiff', tipo: 'lawyer', nome: 'João Pereira', oab: 'OAB/SP 123456' },
          { side: 'defendant', tipo: 'party', nome: 'Indústria Exemplo Ltda.' },
        ],
      }),
    );
    expect(primeira.status).toBe(201);
    expect(primeira.body.data.parties).toEqual([
      { partyId: expect.any(String), side: 'plaintiff', tipo: 'party', nome: 'Maria da Silva' },
      { partyId: expect.any(String), side: 'plaintiff', tipo: 'lawyer', nome: 'João Pereira' },
      { partyId: expect.any(String), side: 'defendant', tipo: 'party', nome: 'Indústria Exemplo Ltda.' },
    ]);

    const segunda = await as(request(app).post('/expert-cases')).send(
      legalCase('0009999-11.2026.5.02.0002', {
        parties: [
          { side: 'plaintiff', tipo: 'party', nome: 'MARIA S.', documento: '12345678909' },
          { side: 'plaintiff', tipo: 'lawyer', nome: 'Dr. João', oab: 'SP123456' },
          { side: 'defendant', tipo: 'party', nome: 'Indústria Exemplo Ltda.' },
          { side: 'defendant', tipo: 'party', nome: 'Outra Ré S.A.' },
        ],
      }),
    );
    expect(segunda.status).toBe(201);
    const ids = (body: { data: { parties: { partyId: string }[] } }) => body.data.parties.map((p) => p.partyId);
    expect(ids(segunda.body).slice(0, 3)).toEqual(ids(primeira.body));
    // A cópia guarda o nome do cadastro reaproveitado, não o digitado.
    expect(segunda.body.data.parties[0].nome).toBe('Maria da Silva');
    expect(await Party.countDocuments({})).toBe(4);

    const ofParty = await as(request(app).get(`/parties/${ids(primeira.body)[2]}/expert-cases`));
    expect(ofParty.body.data.map((p: { processNumber: string }) => p.processNumber).sort()).toEqual([
      '0001234-56.2026.5.02.0001',
      '0009999-11.2026.5.02.0002',
    ]);
  });

  it('parteId usa o cadastro escolhido; id inexistente é 400 party_not_found; PATCH substitui a lista', async () => {
    const { as } = await seedSession();
    const party = await as(request(app).post('/parties')).send({ tipo: 'party', nome: 'Ré Escolhida', email: '' });
    expect(party.status).toBe(201);
    expect(party.body.data).not.toHaveProperty('email');

    const criada = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        parties: [{ partyId: party.body.data.id, side: 'defendant', tipo: 'party', nome: 'qualquer' }],
      }),
    );
    expect(criada.body.data.parties[0]).toMatchObject({ partyId: party.body.data.id, nome: 'Ré Escolhida' });

    const inexistente = await as(request(app).patch(`/expert-cases/${criada.body.data.id}`)).send({
      parties: [{ partyId: '0123456789abcdef01234567', side: 'defendant', tipo: 'party', nome: 'x' }],
    });
    expect(inexistente.status).toBe(400);
    expect(inexistente.body.message).toBe('party_not_found');

    const vazia = await as(request(app).patch(`/expert-cases/${criada.body.data.id}`)).send({ parties: [] });
    expect(vazia.body.data.parties).toEqual([]);
  });

  it('renomear a parte atualiza a cópia do nome nas perícias; outro tenant não vê a parte', async () => {
    const { as } = await seedSession();
    const criada = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', { parties: [{ side: 'plaintiff', tipo: 'party', nome: 'Maria' }] }),
    );
    const partyId = criada.body.data.parties[0].partyId;

    const editada = await as(request(app).patch(`/parties/${partyId}`)).send({
      nome: 'Maria da Silva',
      telefone: '(11) 99999-0000',
    });
    expect(editada.body.data).toMatchObject({ nome: 'Maria da Silva', telefone: '(11) 99999-0000' });
    const lida = await as(request(app).get(`/expert-cases/${criada.body.data.id}`));
    expect(lida.body.data.parties[0].nome).toBe('Maria da Silva');

    const outro = await seedSession();
    expect((await outro.as(request(app).get(`/parties/${partyId}`))).status).toBe(404);
    expect((await outro.as(request(app).get('/parties'))).body.data.total).toBe(0);
  });

  it('lista por tipo e busca por nome; a busca de perícias acha pelo nome da parte', async () => {
    const { as } = await seedSession();
    await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        parties: [
          { side: 'defendant', tipo: 'party', nome: 'Metalúrgica Horizonte' },
          { side: 'defendant', tipo: 'lawyer', nome: 'Ana Souza', oab: 'SP654321' },
        ],
      }),
    );
    const lawyers = await as(request(app).get('/parties').query({ tipo: 'lawyer' }));
    expect(lawyers.body.data.items.map((p: { nome: string }) => p.nome)).toEqual(['Ana Souza']);

    await expect
      .poll(async () => (await as(request(app).get('/parties').query({ q: 'metalurg' }))).body.data.total, {
        timeout: 15_000,
      })
      .toBe(1);
    await expect
      .poll(async () => (await as(request(app).get('/expert-cases').query({ q: 'horizonte' }))).body.data.total, {
        timeout: 15_000,
      })
      .toBe(1);
  });

  it('grava os dados trabalhistas e o período imprescrito sugerido quando vem vazio (IMP-04)', async () => {
    const { as } = await seedSession();
    const criada = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        docketingDate: '2026-03-10',
        hireDate: '2018-02-01',
        terminationDate: '2025-12-20',
        claimantJob: 'Operadora de máquinas',
        location: 'Rua das Indústrias, 100',
      }),
    );
    expect(criada.body.data).toMatchObject({
      claimantJob: 'Operadora de máquinas',
      location: 'Rua das Indústrias, 100',
      nonPrescribedPeriodStart: '2021-03-10',
      nonPrescribedPeriodEnd: '2025-12-20',
    });
  });
});
