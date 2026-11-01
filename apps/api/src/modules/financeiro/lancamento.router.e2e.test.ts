import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { Case, connect, dateInDisplayTz, disconnect, hashToken, Lancamento, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();
const today = dateInDisplayTz(new Date());

let counter = 0;
const seedSession = async (role: Role[] = ['admin']) => {
  counter += 1;
  const tenant = await Tenant.create({
    name: `Escritório ${counter}`,
    document: `6666666600${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `fin-${counter}@x.com`,
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
  return <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
};

const FEE = {
  natureza: 'income',
  categoria: 'fixed_fees',
  descricao: 'Honorários fixados',
  valorCents: 480_000,
  vencimento: '2026-12-01',
};

describe('recebimento parcial de honorários (PRZ-02, AD-111)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Lancamento.deleteMany({}),
      Case.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('R$ 4.800: parcela de 1.500 deixa parcial com saldo 3.300; estorno volta a previsto; quitação liquida', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send(FEE)).body.data;

    const parcial = await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      valorCents: 150_000,
      data: today,
      conta: 'Banco do Brasil',
    });
    expect(parcial.status).toBe(201);
    expect(parcial.body.data).toMatchObject({ status: 'partial', recebidoCents: 150_000, saldoCents: 330_000 });
    const [parcela] = parcial.body.data.parcelas;
    expect(parcela).toMatchObject({ valorCents: 150_000, data: today, conta: 'Banco do Brasil' });

    const estorno = await as(request(app).delete(`/finance/entries/${id}/installments/${parcela.id}`));
    expect(estorno.body.data).toMatchObject({
      status: 'expected',
      recebidoCents: 0,
      saldoCents: 480_000,
      parcelas: [],
    });

    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ valorCents: 300_000, data: today });
    const quitado = await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      valorCents: 180_000,
      data: today,
    });
    expect(quitado.body.data).toMatchObject({ status: 'settled', saldoCents: 0 });
  });

  it('parcela maior que o saldo é recusada com 422 parcel_exceeds_balance e nada muda', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send(FEE)).body.data;
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ valorCents: 400_000, data: today });

    const excede = await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      valorCents: 80_001,
      data: today,
    });
    expect(excede.status).toBe(422);
    expect(excede.body.message).toBe('parcel_exceeds_balance');
    expect((await Lancamento.findById(id).lean())?.parcelas).toHaveLength(1);
  });

  it('honorário não é excluído nem tem status à mão; valor não fica abaixo do recebido; despesa continua excluível', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send(FEE)).body.data;
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ valorCents: 200_000, data: today });

    const excluir = await as(request(app).delete(`/finance/entries/${id}`));
    expect(excluir.status).toBe(409);
    expect(excluir.body.message).toBe('fee_cannot_be_removed');

    const cancelar = await as(request(app).patch(`/finance/entries/${id}`)).send({ status: 'canceled' });
    expect(cancelar.status).toBe(422);
    expect(cancelar.body.message).toBe('fee_status_comes_from_parcels');

    const abaixo = await as(request(app).patch(`/finance/entries/${id}`)).send({ valorCents: 199_999 });
    expect(abaixo.status).toBe(422);
    expect(abaixo.body.message).toBe('amount_below_received');

    const igual = await as(request(app).patch(`/finance/entries/${id}`)).send({ valorCents: 200_000 });
    expect(igual.body.data).toMatchObject({ status: 'settled', saldoCents: 0 });

    const despesa = (
      await as(request(app).post('/finance/entries')).send({
        natureza: 'expense',
        categoria: 'supplies',
        descricao: 'Calibração',
        valorCents: 10_000,
        vencimento: today,
      })
    ).body.data;
    expect((await as(request(app).delete(`/finance/entries/${despesa.id}`))).status).toBe(200);
  });

  it('resumo e fluxo contam o recebido pela data de cada parcela e o saldo como a receber (PRZ-02.5)', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send({ ...FEE, vencimento: '2020-01-10' })).body
      .data;
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ valorCents: 150_000, data: today });
    // Parcela de outro mês: entra no recebido do mês dela, não no deste (nem no fluxo de 1 mês).
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      valorCents: 50_000,
      data: '2020-02-01',
    });

    const resumo = (await as(request(app).get('/finance/summary'))).body.data;
    expect(resumo).toMatchObject({ aReceberCents: 280_000, lateCents: 280_000, recebidoMesCents: 150_000 });

    const fluxo = (await as(request(app).get('/finance/flow?meses=1'))).body.data;
    expect(fluxo).toEqual([{ mes: today.slice(0, 7), recebidoCents: 150_000, aReceberCents: 0, despesasCents: 0 }]);

    const atrasados = (await as(request(app).get('/finance/entries?state=overdue'))).body.data;
    expect(atrasados.items.map((item: { id: string }) => item.id)).toEqual([id]);
  });

  it('alterar o honorário fixado da perícia atualiza o lançamento existente em vez de criar outro', async () => {
    const as = await seedSession();
    const legalCase = (
      await as(request(app).post('/expert-cases')).send({
        processNumber: '0001234-56.2026.5.02.0001',
        courtType: 'labor',
        role: 'court_expert',
        court: 'TRT2',
        subject: 'Insalubridade',
      })
    ).body.data;

    await as(request(app).patch(`/expert-cases/${legalCase.id}`)).send({ fixedFeesCents: 300_000 });
    await expect.poll(() => Lancamento.countDocuments({ Case: legalCase.id })).toBe(1);

    await as(request(app).patch(`/expert-cases/${legalCase.id}`)).send({ fixedFeesCents: 350_000 });
    await expect.poll(async () => (await Lancamento.findOne({ Case: legalCase.id }).lean())?.valorCents).toBe(350_000);
    expect(await Lancamento.countDocuments({ Case: legalCase.id })).toBe(1);
  });
});
