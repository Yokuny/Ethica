import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, hashToken, Parte, Pericia, Prazo, Session, Tenant, User } from '@ethica/db';
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
    email: `parte-${counter}@x.com`,
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

const pericia = (numeroProcesso: string, extra: object = {}) => ({
  numeroProcesso,
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT2',
  objeto: 'Insalubridade',
  ...extra,
});

describe('partes e advogados (IMP-03) e dados trabalhistas (IMP-04)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Parte.deleteMany({}),
      Prazo.deleteMany({}),
      Pericia.deleteMany({}),
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
      pericia('0001234-56.2026.5.02.0001', {
        partes: [
          { polo: 'plaintiff', tipo: 'party', nome: 'Maria  da Silva', documento: '123.456.789-09' },
          { polo: 'plaintiff', tipo: 'lawyer', nome: 'João Pereira', oab: 'OAB/SP 123456' },
          { polo: 'defendant', tipo: 'party', nome: 'Indústria Exemplo Ltda.' },
        ],
      }),
    );
    expect(primeira.status).toBe(201);
    expect(primeira.body.data.partes).toEqual([
      { parteId: expect.any(String), polo: 'plaintiff', tipo: 'party', nome: 'Maria da Silva' },
      { parteId: expect.any(String), polo: 'plaintiff', tipo: 'lawyer', nome: 'João Pereira' },
      { parteId: expect.any(String), polo: 'defendant', tipo: 'party', nome: 'Indústria Exemplo Ltda.' },
    ]);

    const segunda = await as(request(app).post('/expert-cases')).send(
      pericia('0009999-11.2026.5.02.0002', {
        partes: [
          { polo: 'plaintiff', tipo: 'party', nome: 'MARIA S.', documento: '12345678909' },
          { polo: 'plaintiff', tipo: 'lawyer', nome: 'Dr. João', oab: 'SP123456' },
          { polo: 'defendant', tipo: 'party', nome: 'Indústria Exemplo Ltda.' },
          { polo: 'defendant', tipo: 'party', nome: 'Outra Ré S.A.' },
        ],
      }),
    );
    expect(segunda.status).toBe(201);
    const ids = (body: { data: { partes: { parteId: string }[] } }) => body.data.partes.map((p) => p.parteId);
    expect(ids(segunda.body).slice(0, 3)).toEqual(ids(primeira.body));
    // A cópia guarda o nome do cadastro reaproveitado, não o digitado.
    expect(segunda.body.data.partes[0].nome).toBe('Maria da Silva');
    expect(await Parte.countDocuments({})).toBe(4);

    const daParte = await as(request(app).get(`/parties/${ids(primeira.body)[2]}/expert-cases`));
    expect(daParte.body.data.map((p: { numeroProcesso: string }) => p.numeroProcesso).sort()).toEqual([
      '0001234-56.2026.5.02.0001',
      '0009999-11.2026.5.02.0002',
    ]);
  });

  it('parteId usa o cadastro escolhido; id inexistente é 400 party_not_found; PATCH substitui a lista', async () => {
    const { as } = await seedSession();
    const parte = await as(request(app).post('/parties')).send({ tipo: 'party', nome: 'Ré Escolhida', email: '' });
    expect(parte.status).toBe(201);
    expect(parte.body.data).not.toHaveProperty('email');

    const criada = await as(request(app).post('/expert-cases')).send(
      pericia('0001234-56.2026.5.02.0001', {
        partes: [{ parteId: parte.body.data.id, polo: 'defendant', tipo: 'party', nome: 'qualquer' }],
      }),
    );
    expect(criada.body.data.partes[0]).toMatchObject({ parteId: parte.body.data.id, nome: 'Ré Escolhida' });

    const inexistente = await as(request(app).patch(`/expert-cases/${criada.body.data.id}`)).send({
      partes: [{ parteId: '0123456789abcdef01234567', polo: 'defendant', tipo: 'party', nome: 'x' }],
    });
    expect(inexistente.status).toBe(400);
    expect(inexistente.body.message).toBe('party_not_found');

    const vazia = await as(request(app).patch(`/expert-cases/${criada.body.data.id}`)).send({ partes: [] });
    expect(vazia.body.data.partes).toEqual([]);
  });

  it('renomear a parte atualiza a cópia do nome nas perícias; outro tenant não vê a parte', async () => {
    const { as } = await seedSession();
    const criada = await as(request(app).post('/expert-cases')).send(
      pericia('0001234-56.2026.5.02.0001', { partes: [{ polo: 'plaintiff', tipo: 'party', nome: 'Maria' }] }),
    );
    const parteId = criada.body.data.partes[0].parteId;

    const editada = await as(request(app).patch(`/parties/${parteId}`)).send({
      nome: 'Maria da Silva',
      telefone: '(11) 99999-0000',
    });
    expect(editada.body.data).toMatchObject({ nome: 'Maria da Silva', telefone: '(11) 99999-0000' });
    const lida = await as(request(app).get(`/expert-cases/${criada.body.data.id}`));
    expect(lida.body.data.partes[0].nome).toBe('Maria da Silva');

    const outro = await seedSession();
    expect((await outro.as(request(app).get(`/parties/${parteId}`))).status).toBe(404);
    expect((await outro.as(request(app).get('/parties'))).body.data.total).toBe(0);
  });

  it('lista por tipo e busca por nome; a busca de perícias acha pelo nome da parte', async () => {
    const { as } = await seedSession();
    await as(request(app).post('/expert-cases')).send(
      pericia('0001234-56.2026.5.02.0001', {
        partes: [
          { polo: 'defendant', tipo: 'party', nome: 'Metalúrgica Horizonte' },
          { polo: 'defendant', tipo: 'lawyer', nome: 'Ana Souza', oab: 'SP654321' },
        ],
      }),
    );
    const advogados = await as(request(app).get('/parties').query({ tipo: 'lawyer' }));
    expect(advogados.body.data.items.map((p: { nome: string }) => p.nome)).toEqual(['Ana Souza']);

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
      pericia('0001234-56.2026.5.02.0001', {
        dataAutuacao: '2026-03-10',
        dataAdmissao: '2018-02-01',
        dataDemissao: '2025-12-20',
        funcaoReclamante: 'Operadora de máquinas',
        localPericia: 'Rua das Indústrias, 100',
      }),
    );
    expect(criada.body.data).toMatchObject({
      funcaoReclamante: 'Operadora de máquinas',
      localPericia: 'Rua das Indústrias, 100',
      periodoImprescritoInicio: '2021-03-10',
      periodoImprescritoFim: '2025-12-20',
    });
  });
});
