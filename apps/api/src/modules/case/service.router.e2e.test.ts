import crypto from 'node:crypto';
import type { Permissions, Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import {
  Appointment,
  Case,
  connect,
  Deadline,
  disconnect,
  hashToken,
  Session,
  Tenant,
  Transaction,
  User,
} from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp({ storage: null });

let counter = 0;
const seedTenant = async () => {
  counter += 1;
  return Tenant.create({
    name: `Escritório ${counter}`,
    document: `6666666600${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[], permissions?: Permissions) => {
  counter += 1;
  const user = await User.create({
    name: `Pessoa ${counter}`,
    email: `case-${counter}@x.com`,
    Tenant: tenantId,
    role,
    permissions,
  });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { user, as };
};

const JUDICIAL = {
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
} as const;

const PRIVATE_SERVICE = {
  courtType: 'other',
  serviceType: 'Avaliação de imóvel',
  role: 'technical_assistant',
  subject: 'Avaliação do apartamento da Rua A',
  contractor: { name: 'Construtora Alfa' },
} as const;

describe('serviços — tipo, status, data da perícia e despesas (SRV-02/03/05/06)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Appointment.deleteMany({}),
      Transaction.deleteMany({}),
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

  it('tipo novo dispensa número e tribunal e aparece na lista de tipos; tipo judicial exige (AD-158)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);

    const first = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...PRIVATE_SERVICE, status: 'fees_proposed' });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ serviceType: 'Avaliação de imóvel', status: 'fees_proposed' });
    expect(first.body.data.processNumber).toBeUndefined();
    // Two services without a number in the same office.
    expect((await admin.as(request(app).post('/expert-cases')).send(PRIVATE_SERVICE)).status).toBe(201);

    const { processNumber: _, ...withoutNumber } = JUDICIAL;
    expect((await admin.as(request(app).post('/expert-cases')).send(withoutNumber)).status).toBe(400);
    expect(
      (await admin.as(request(app).post('/expert-cases')).send({ ...JUDICIAL, serviceType: 'Avaliação de imóvel' }))
        .status,
    ).toBe(400);

    const types = await admin.as(request(app).get('/expert-cases/service-types'));
    expect(types.body.data).toEqual([{ name: 'Avaliação de imóvel', role: 'technical_assistant', statuses: [] }]);

    // Becoming judicial drops the type name and requires the process.
    const id = first.body.data.id;
    expect((await admin.as(request(app).patch(`/expert-cases/${id}`)).send({ courtType: 'civil' })).status).toBe(422);
    const judicial = await admin
      .as(request(app).patch(`/expert-cases/${id}`))
      .send({ courtType: 'civil', processNumber: '0009999-11.2026.8.26.0100', court: 'TJSP' });
    expect(judicial.status).toBe(200);
    expect(judicial.body.data.serviceType).toBeUndefined();
    expect(judicial.body.data.contractor).toBeUndefined();
  });

  it('tipo próprio: contratante, atuação e status digitados, entrega e pagamento no cadastro (AD-176)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operator = await seedSession(tenant._id, ['operator']);
    const own = {
      ...PRIVATE_SERVICE,
      role: 'other',
      roleName: 'Consultoria',
      status: 'custom',
      statusName: 'Aguardando documentos',
      contractor: { name: 'Construtora Alfa', document: '11.222.333/0001-81', address: 'Rua A, 10' },
      nominationDate: '2026-11-01',
      reportDeadline: '2026-12-01',
      fixedFeesCents: 300_000,
      payment: { amountCents: 100_000, date: '2026-11-05' },
    };

    // The typed role or status needs its name; a judicial type takes neither.
    expect((await admin.as(request(app).post('/expert-cases')).send({ ...own, roleName: undefined })).status).toBe(400);
    expect((await admin.as(request(app).post('/expert-cases')).send({ ...JUDICIAL, status: 'custom' })).status).toBe(
      400,
    );
    expect(
      (
        await admin
          .as(request(app).post('/expert-cases'))
          .send({ ...own, payment: { amountCents: 400_000, date: '2026-11-05' } })
      ).status,
    ).toBe(400);
    // Whoever does not post in finance does not send the payment.
    expect((await operator.as(request(app).post('/expert-cases')).send(own)).status).toBe(403);

    const created = await admin.as(request(app).post('/expert-cases')).send(own);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      roleName: 'Consultoria',
      statusName: 'Aguardando documentos',
      contractor: { name: 'Construtora Alfa', document: '11222333000181', address: 'Rua A, 10' },
    });
    const id = created.body.data.id;
    expect(await Deadline.findOne({ Case: id }).lean()).toMatchObject({
      title: 'Entrega do serviço',
      dueDate: '2026-12-01',
    });
    await expect.poll(async () => (await Transaction.findOne({ Case: id }).lean())?.installments?.length).toBe(1);
    expect(await Transaction.findOne({ Case: id }).lean()).toMatchObject({
      category: 'contracted_fees',
      amountCents: 300_000,
      status: 'partial',
      installments: [expect.objectContaining({ amountCents: 100_000, date: '2026-11-05' })],
    });

    const types = await admin.as(request(app).get('/expert-cases/service-types'));
    expect(types.body.data).toEqual([
      { name: 'Avaliação de imóvel', role: 'other', roleName: 'Consultoria', statuses: ['Aguardando documentos'] },
    ]);

    // Completed closes it and drops the typed status.
    const completed = await admin.as(request(app).patch(`/expert-cases/${id}`)).send({ status: 'completed' });
    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({ status: 'completed' });
    expect(completed.body.data.statusName).toBeUndefined();
  });

  it('a data da perícia no cadastro vira compromisso de perícia na agenda (AD-160)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);

    const created = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...JUDICIAL, inspection: { date: '2026-12-10', time: '09:30', location: '-23.5505, -46.6333' } });
    expect(created.status).toBe(201);

    await expect.poll(() => Appointment.countDocuments({ Case: created.body.data.id })).toBe(1);
    const appointment = await Appointment.findOne({ Case: created.body.data.id }).lean();
    expect(appointment).toMatchObject({
      type: 'inspection',
      title: `Perícia — ${JUDICIAL.processNumber}`,
      location: '-23.5505, -46.6333',
    });
    expect((appointment?.end.getTime() ?? 0) - (appointment?.start.getTime() ?? 0)).toBe(60 * 60_000);

    // Typed coordinates go straight to the map, without the geocoder.
    const geocoded = await admin.as(request(app).post(`/agenda/${appointment?._id}/geocode`));
    expect(geocoded.body.data.coordinates).toMatchObject({ lat: -23.5505, lng: -46.6333 });
  });

  it('despesa com categoria nova guarda o nome e entra na lista de categorias (AD-159)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const created = await admin.as(request(app).post('/expert-cases')).send(JUDICIAL);
    const expense = {
      kind: 'expense',
      category: 'other_expenses',
      categoryName: 'Estacionamento',
      description: 'Estacionamento da vistoria',
      amountCents: 3_000,
      dueDate: '2026-12-10',
      caseId: created.body.data.id,
    };

    const posted = await admin.as(request(app).post('/finance/entries')).send(expense);
    expect(posted.status).toBe(201);
    expect(posted.body.data.categoryName).toBe('Estacionamento');
    expect((await admin.as(request(app).post('/finance/entries')).send({ ...expense, category: 'food' })).status).toBe(
      400,
    );
    expect((await admin.as(request(app).get('/finance/expense-names'))).body.data).toEqual(['Estacionamento']);

    const changed = await admin
      .as(request(app).patch(`/finance/entries/${posted.body.data.id}`))
      .send({ category: 'food' });
    expect(changed.body.data.categoryName).toBeUndefined();
  });
});
