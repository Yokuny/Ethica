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
    const first = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        parties: [
          { side: 'plaintiff', type: 'party', name: 'Maria  da Silva', document: '123.456.789-09' },
          { side: 'plaintiff', type: 'lawyer', name: 'João Pereira', oab: 'OAB/SP 123456' },
          { side: 'defendant', type: 'party', name: 'Indústria Exemplo Ltda.' },
        ],
      }),
    );
    expect(first.status).toBe(201);
    expect(first.body.data.parties).toEqual([
      { partyId: expect.any(String), side: 'plaintiff', type: 'party', name: 'Maria da Silva' },
      { partyId: expect.any(String), side: 'plaintiff', type: 'lawyer', name: 'João Pereira' },
      { partyId: expect.any(String), side: 'defendant', type: 'party', name: 'Indústria Exemplo Ltda.' },
    ]);

    const segunda = await as(request(app).post('/expert-cases')).send(
      legalCase('0009999-11.2026.5.02.0002', {
        parties: [
          { side: 'plaintiff', type: 'party', name: 'MARIA S.', document: '12345678909' },
          { side: 'plaintiff', type: 'lawyer', name: 'Dr. João', oab: 'SP123456' },
          { side: 'defendant', type: 'party', name: 'Indústria Exemplo Ltda.' },
          { side: 'defendant', type: 'party', name: 'Outra Ré S.A.' },
        ],
      }),
    );
    expect(segunda.status).toBe(201);
    const ids = (body: { data: { parties: { partyId: string }[] } }) => body.data.parties.map((p) => p.partyId);
    expect(ids(segunda.body).slice(0, 3)).toEqual(ids(first.body));
    // The copy keeps the name of the reused record, not the typed one.
    expect(segunda.body.data.parties[0].name).toBe('Maria da Silva');
    expect(await Party.countDocuments({})).toBe(4);

    const ofParty = await as(request(app).get(`/parties/${ids(first.body)[2]}/expert-cases`));
    expect(ofParty.body.data.map((p: { processNumber: string }) => p.processNumber).sort()).toEqual([
      '0001234-56.2026.5.02.0001',
      '0009999-11.2026.5.02.0002',
    ]);
  });

  it('parteId usa o cadastro escolhido; id inexistente é 400 party_not_found; PATCH substitui a lista', async () => {
    const { as } = await seedSession();
    const party = await as(request(app).post('/parties')).send({ type: 'party', name: 'Ré Escolhida', email: '' });
    expect(party.status).toBe(201);
    expect(party.body.data).not.toHaveProperty('email');

    const created = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        parties: [{ partyId: party.body.data.id, side: 'defendant', type: 'party', name: 'qualquer' }],
      }),
    );
    expect(created.body.data.parties[0]).toMatchObject({ partyId: party.body.data.id, name: 'Ré Escolhida' });

    const missing = await as(request(app).patch(`/expert-cases/${created.body.data.id}`)).send({
      parties: [{ partyId: '0123456789abcdef01234567', side: 'defendant', type: 'party', name: 'x' }],
    });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('party_not_found');

    const empty = await as(request(app).patch(`/expert-cases/${created.body.data.id}`)).send({ parties: [] });
    expect(empty.body.data.parties).toEqual([]);
  });

  it('renomear a parte atualiza a cópia do nome nas perícias; outro tenant não vê a parte', async () => {
    const { as } = await seedSession();
    const created = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', { parties: [{ side: 'plaintiff', type: 'party', name: 'Maria' }] }),
    );
    const partyId = created.body.data.parties[0].partyId;

    const editada = await as(request(app).patch(`/parties/${partyId}`)).send({
      name: 'Maria da Silva',
      phone: '(11) 99999-0000',
    });
    expect(editada.body.data).toMatchObject({ name: 'Maria da Silva', phone: '(11) 99999-0000' });
    const lida = await as(request(app).get(`/expert-cases/${created.body.data.id}`));
    expect(lida.body.data.parties[0].name).toBe('Maria da Silva');

    const other = await seedSession();
    expect((await other.as(request(app).get(`/parties/${partyId}`))).status).toBe(404);
    expect((await other.as(request(app).get('/parties'))).body.data.total).toBe(0);
  });

  it('lista por tipo e busca por nome; a busca de perícias acha pelo nome da parte', async () => {
    const { as } = await seedSession();
    await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        parties: [
          { side: 'defendant', type: 'party', name: 'Metalúrgica Horizonte' },
          { side: 'defendant', type: 'lawyer', name: 'Ana Souza', oab: 'SP654321' },
        ],
      }),
    );
    const lawyers = await as(request(app).get('/parties').query({ type: 'lawyer' }));
    expect(lawyers.body.data.items.map((p: { name: string }) => p.name)).toEqual(['Ana Souza']);

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
    const created = await as(request(app).post('/expert-cases')).send(
      legalCase('0001234-56.2026.5.02.0001', {
        docketingDate: '2026-03-10',
        hireDate: '2018-02-01',
        terminationDate: '2025-12-20',
        claimantJob: 'Operadora de máquinas',
        location: 'Rua das Indústrias, 100',
      }),
    );
    expect(created.body.data).toMatchObject({
      claimantJob: 'Operadora de máquinas',
      location: 'Rua das Indústrias, 100',
      nonPrescribedPeriodStart: '2021-03-10',
      nonPrescribedPeriodEnd: '2025-12-20',
    });
  });
  it('nome repetido: reaproveita sem diferença de acento, completa contatos e junta os antigos (PSV-05, PSV-06)', async () => {
    const { tenant, as } = await seedSession(['admin']);
    const first = await as(request(app).post('/expert-cases')).send(
      legalCase('0000101-11.2026.5.02.0001', {
        parties: [{ side: 'plaintiff', type: 'party', name: 'José da Silva' }],
      }),
    );
    expect(first.status).toBe(201);
    // Same person written differently, now with CREA and phone: reused and completed.
    const second = await as(request(app).post('/expert-cases')).send(
      legalCase('0000102-11.2026.5.02.0001', {
        parties: [
          {
            side: 'plaintiff',
            type: 'party',
            name: 'JOSE  DA SILVA',
            crea: 'CREA/SC 184822-0',
            phone: '(47) 99999-0000',
          },
        ],
      }),
    );
    expect(second.body.data.parties[0].partyId).toBe(first.body.data.parties[0].partyId);
    const party = await as(request(app).get(`/parties/${first.body.data.parties[0].partyId}`));
    expect(party.body.data).toMatchObject({ crea: 'SC1848220', phone: '(47) 99999-0000' });

    // Duplicates saved before the rule: the merge keeps the oldest, completes it and moves the cases.
    const older = await Party.create({ Tenant: tenant._id, type: 'lawyer', name: 'Ana Souza' });
    const newer = await Party.create({ Tenant: tenant._id, type: 'lawyer', name: 'ANA SOUZA', oab: 'SP123' });
    await Party.create({ Tenant: tenant._id, type: 'lawyer', name: 'Ana Souza', oab: 'RJ999' });
    const withNewer = await as(request(app).post('/expert-cases')).send(
      legalCase('0000103-11.2026.5.02.0001', {
        parties: [{ side: 'plaintiff', type: 'lawyer', name: 'ANA SOUZA', partyId: newer.id }],
      }),
    );
    const operator = await as(request(app).post('/parties/merge-duplicates'));
    expect(operator.status).toBe(200);
    expect(operator.body.data).toEqual({ merged: 1 });
    expect(await Party.findById(newer.id)).toBeNull();
    expect((await Party.findById(older.id))?.oab).toBe('SP123');
    const moved = await as(request(app).get(`/expert-cases/${withNewer.body.data.id}`));
    expect(moved.body.data.parties[0].partyId).toBe(older.id);
    // Different OAB is another person: kept.
    expect(await Party.countDocuments({ Tenant: tenant._id, type: 'lawyer' })).toBe(2);
  });
});
