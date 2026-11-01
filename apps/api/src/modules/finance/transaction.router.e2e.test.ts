import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { Case, connect, dateInDisplayTz, disconnect, hashToken, Session, Tenant, Transaction, User } from '@ethica/db';
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
  kind: 'income',
  category: 'fixed_fees',
  description: 'Honorários fixados',
  amountCents: 480_000,
  dueDate: '2026-12-01',
};

describe('recebimento parcial de honorários (PRZ-02, AD-111)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Transaction.deleteMany({}),
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

    const partial = await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      amountCents: 150_000,
      date: today,
      account: 'Banco do Brasil',
    });
    expect(partial.status).toBe(201);
    expect(partial.body.data).toMatchObject({ status: 'partial', receivedCents: 150_000, balanceCents: 330_000 });
    const [installment] = partial.body.data.installments;
    expect(installment).toMatchObject({ amountCents: 150_000, date: today, account: 'Banco do Brasil' });

    const estorno = await as(request(app).delete(`/finance/entries/${id}/installments/${installment.id}`));
    expect(estorno.body.data).toMatchObject({
      status: 'expected',
      receivedCents: 0,
      balanceCents: 480_000,
      installments: [],
    });

    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ amountCents: 300_000, date: today });
    const quitado = await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      amountCents: 180_000,
      date: today,
    });
    expect(quitado.body.data).toMatchObject({ status: 'settled', balanceCents: 0 });
  });

  it('parcela maior que o saldo é recusada com 422 parcel_exceeds_balance e nada muda', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send(FEE)).body.data;
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ amountCents: 400_000, date: today });

    const excede = await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      amountCents: 80_001,
      date: today,
    });
    expect(excede.status).toBe(422);
    expect(excede.body.message).toBe('parcel_exceeds_balance');
    expect((await Transaction.findById(id).lean())?.installments).toHaveLength(1);
  });

  it('honorário não é excluído nem tem status à mão; valor não fica abaixo do recebido; despesa continua excluível', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send(FEE)).body.data;
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ amountCents: 200_000, date: today });

    const removal = await as(request(app).delete(`/finance/entries/${id}`));
    expect(removal.status).toBe(409);
    expect(removal.body.message).toBe('fee_cannot_be_removed');

    const cancelar = await as(request(app).patch(`/finance/entries/${id}`)).send({ status: 'canceled' });
    expect(cancelar.status).toBe(422);
    expect(cancelar.body.message).toBe('fee_status_comes_from_parcels');

    const abaixo = await as(request(app).patch(`/finance/entries/${id}`)).send({ amountCents: 199_999 });
    expect(abaixo.status).toBe(422);
    expect(abaixo.body.message).toBe('amount_below_received');

    const igual = await as(request(app).patch(`/finance/entries/${id}`)).send({ amountCents: 200_000 });
    expect(igual.body.data).toMatchObject({ status: 'settled', balanceCents: 0 });

    const expense = (
      await as(request(app).post('/finance/entries')).send({
        kind: 'expense',
        category: 'supplies',
        description: 'Calibração',
        amountCents: 10_000,
        dueDate: today,
      })
    ).body.data;
    expect((await as(request(app).delete(`/finance/entries/${expense.id}`))).status).toBe(200);
  });

  it('resumo e fluxo contam o recebido pela data de cada parcela e o saldo como a receber (PRZ-02.5)', async () => {
    const as = await seedSession();
    const { id } = (await as(request(app).post('/finance/entries')).send({ ...FEE, dueDate: '2020-01-10' })).body.data;
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({ amountCents: 150_000, date: today });
    // Parcela de outro mês: entra no recebido do mês dela, não no deste (nem no fluxo de 1 mês).
    await as(request(app).post(`/finance/entries/${id}/installments`)).send({
      amountCents: 50_000,
      date: '2020-02-01',
    });

    const summary = (await as(request(app).get('/finance/summary'))).body.data;
    expect(summary).toMatchObject({ receivableCents: 280_000, lateCents: 280_000, receivedMonthCents: 150_000 });

    const flow = (await as(request(app).get('/finance/flow?months=1'))).body.data;
    expect(flow).toEqual([{ month: today.slice(0, 7), receivedCents: 150_000, receivableCents: 0, expensesCents: 0 }]);

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
    await expect.poll(() => Transaction.countDocuments({ Case: legalCase.id })).toBe(1);

    await as(request(app).patch(`/expert-cases/${legalCase.id}`)).send({ fixedFeesCents: 350_000 });
    await expect
      .poll(async () => (await Transaction.findOne({ Case: legalCase.id }).lean())?.amountCents)
      .toBe(350_000);
    expect(await Transaction.countDocuments({ Case: legalCase.id })).toBe(1);
  });
});
