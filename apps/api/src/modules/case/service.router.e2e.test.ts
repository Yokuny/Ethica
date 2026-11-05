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
  serviceType: 'Avaliação de imóvel',
  role: 'technical_assistant',
  subject: 'Avaliação do apartamento da Rua A',
  contractor: { name: 'Construtora Alfa' },
} as const;

describe('serviços — tipo, fase, status, data da perícia e despesas (SRV-02/03/05/06, AD-178)', () => {
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

  it('perícia exige esfera, processo e tribunal; assistência e tipo novo não; tipos do escritório listados', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const post = (body: object) => admin.as(request(app).post('/expert-cases')).send(body);

    const first = await post({ ...PRIVATE_SERVICE, phase: 'awaiting_inspection' });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      serviceType: 'Avaliação de imóvel',
      phase: 'awaiting_inspection',
      status: 'active',
    });
    expect(first.body.data.processNumber).toBeUndefined();
    // Two services without a number in the same office.
    expect((await post(PRIVATE_SERVICE)).status).toBe(201);

    const { processNumber: _, ...withoutNumber } = JUDICIAL;
    const { courtType: __, ...withoutSphere } = JUDICIAL;
    expect((await post(withoutNumber)).status).toBe(400);
    expect((await post(withoutSphere)).status).toBe(400);
    // Technical assistance takes the contractor, without sphere or process.
    const assistance = await post({
      role: 'technical_assistant',
      subject: 'Assistência ao reclamante',
      contractor: { name: 'Maria' },
    });
    expect(assistance.status).toBe(201);
    expect(assistance.body.data.courtType).toBeUndefined();

    const types = await admin.as(request(app).get('/expert-cases/service-types'));
    expect(types.body.data).toEqual([{ name: 'Avaliação de imóvel', role: 'technical_assistant', phases: [] }]);

    // Becoming a perícia (the type name cleared with null) drops the own type's fields and requires the process.
    const id = first.body.data.id;
    const patch = (body: object) => admin.as(request(app).patch(`/expert-cases/${id}`)).send(body);
    expect((await patch({ serviceType: null, role: 'court_expert', courtType: 'civil' })).status).toBe(422);
    const judicial = await patch({
      serviceType: null,
      role: 'court_expert',
      courtType: 'civil',
      processNumber: '0009999-11.2026.8.26.0100',
      court: 'TJSP',
    });
    expect(judicial.status).toBe(200);
    expect(judicial.body.data.serviceType).toBeUndefined();
    expect(judicial.body.data.contractor).toBeUndefined();
    // Back to assistance: the sphere goes away.
    const back = await patch({ role: 'technical_assistant', contractor: { name: 'Maria' }, phase: 'assistance_hired' });
    expect(back.status).toBe(200);
    expect(back.body.data.courtType).toBeUndefined();
  });

  it('tipo próprio: contratante, atuação e fase digitadas, entrega e pagamento no cadastro (AD-176)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operator = await seedSession(tenant._id, ['operator']);
    const own = {
      ...PRIVATE_SERVICE,
      role: 'other',
      roleName: 'Consultoria',
      phase: 'custom',
      phaseName: 'Aguardando documentos',
      contractor: { name: 'Construtora Alfa', document: '11.222.333/0001-81', address: 'Rua A, 10' },
      nominationDate: '2026-11-01',
      reportDeadline: '2026-12-01',
      fixedFeesCents: 300_000,
      payment: { amountCents: 100_000, date: '2026-11-05' },
    };

    // The typed role or phase needs its name; perícia and assistance take neither.
    expect((await admin.as(request(app).post('/expert-cases')).send({ ...own, roleName: undefined })).status).toBe(400);
    expect((await admin.as(request(app).post('/expert-cases')).send({ ...JUDICIAL, phase: 'custom' })).status).toBe(
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
      phaseName: 'Aguardando documentos',
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
      { name: 'Avaliação de imóvel', role: 'other', roleName: 'Consultoria', phases: ['Aguardando documentos'] },
    ]);

    // "Honorários recebidos" closes it and drops the typed phase.
    const done = await admin.as(request(app).patch(`/expert-cases/${id}`)).send({ phase: 'fees_received' });
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({ phase: 'fees_received' });
    expect(done.body.data.phaseName).toBeUndefined();
  });

  it('assistência técnica tem a lista de fases própria e só encerra com honorários ou acordo (AD-186)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const post = (body: object) => admin.as(request(app).post('/expert-cases')).send(body);
    const assistance = {
      role: 'technical_assistant',
      subject: 'Assistência ao reclamante',
      contractor: { name: 'Maria' },
    };

    const created = await post(assistance);
    expect(created.status).toBe(201);
    expect(created.body.data.phase).toBe('assistance_hired');
    // Each type only takes a phase of its own list.
    expect((await post({ ...assistance, phase: 'drafting_report' })).status).toBe(400);
    expect((await post({ ...JUDICIAL, phase: 'technical_opinion_drafting' })).status).toBe(400);
    expect((await post({ ...JUDICIAL, phase: 'fees_received' })).status).toBe(201);

    const id = created.body.data.id;
    const patch = (body: object) => admin.as(request(app).patch(`/expert-cases/${id}`)).send(body);
    const stats = async () =>
      Object.fromEntries(
        (
          (await admin.as(request(app).get('/expert-cases/stats'))).body.data.groups as { key: string; count: number }[]
        ).map((group) => [group.key, group.count]),
      );
    expect(await stats()).toMatchObject({ open: 1, reports_delivered: 1 });
    expect((await patch({ phase: 'technical_opinion_delivered' })).status).toBe(200);
    expect(await stats()).toMatchObject({ open: 1, reports_delivered: 2 });
    // "Assistência finalizada" stays open; fees received or settlement close it.
    await patch({ phase: 'assistance_finished' });
    expect(await stats()).toMatchObject({ open: 1 });
    await patch({ phase: 'assistance_settlement' });
    expect(await stats()).toMatchObject({ open: 0, reports_delivered: 1 });
  });

  it('ordena por nome, data do cadastro, tipo e data da modificação, crescente e decrescente (AD-188)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const post = async (body: object) =>
      (await admin.as(request(app).post('/expert-cases')).send(body)).body.data.id as string;
    const own = await post({ ...PRIVATE_SERVICE, subject: 'Avaliação B' });
    const assistance = await post({ role: 'technical_assistant', subject: 'assistência A', contractor: { name: 'M' } });
    const judicial = await post(JUDICIAL);
    await admin.as(request(app).patch(`/expert-cases/${own}`)).send({ notes: 'mexido por último' });

    const ids = async (query: string) =>
      ((await admin.as(request(app).get(`/expert-cases?${query}`))).body.data.items as { id: string }[]).map(
        (item) => item.id,
      );
    expect(await ids('')).toEqual([judicial, assistance, own]);
    expect(await ids('sort=createdAt&order=asc')).toEqual([own, assistance, judicial]);
    // Name: the process number (digits) before the objects, ignoring upper case.
    expect(await ids('sort=name&order=asc')).toEqual([judicial, assistance, own]);
    expect(await ids('sort=type&order=asc')).toEqual([judicial, assistance, own]);
    expect(await ids('sort=type&order=desc')).toEqual([own, assistance, judicial]);
    expect(await ids('sort=updatedAt&order=desc')).toEqual([own, judicial, assistance]);
    expect((await admin.as(request(app).get('/expert-cases?sort=phase'))).status).toBe(400);
    // Service order (AD-190): the ones without an OS at the end, in both directions.
    await admin.as(request(app).patch(`/expert-cases/${assistance}`)).send({ serviceOrder: 'TS-0002' });
    await admin.as(request(app).patch(`/expert-cases/${judicial}`)).send({ serviceOrder: 'TS-0001' });
    expect(await ids('sort=serviceOrder&order=asc')).toEqual([judicial, assistance, own]);
    expect(await ids('sort=serviceOrder&order=desc')).toEqual([assistance, judicial, own]);
  });

  it('indicador da OS: a última usada e a próxima, pulando a já usada (AD-190)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const preview = async () => (await admin.as(request(app).get('/expert-cases/service-order/preview'))).body.data;
    expect(await preview()).toEqual({});
    await admin.as(request(app).post('/expert-cases')).send({ ...PRIVATE_SERVICE, serviceOrder: 'OS-9' });
    expect(await preview()).toEqual({ last: 'OS-9' });

    const year = Number(new Date().toISOString().slice(0, 4));
    await admin
      .as(request(app).put('/expert-cases/service-order'))
      .send({ pattern: '[SIGLA]-[NUMERO]', prefix: 'TS', digits: 3, year, last: 4 });
    await admin.as(request(app).post('/expert-cases')).send({ ...PRIVATE_SERVICE, serviceOrder: 'TS-005' });
    expect(await preview()).toEqual({ last: 'TS-005', next: 'TS-006' });
    const created = await admin.as(request(app).post('/expert-cases')).send(PRIVATE_SERVICE);
    expect(created.body.data.serviceOrder).toBe('TS-006');
  });

  it('número de controle nunca se repete: maiúsculas iguais, encerrado ou excluído (AD-187)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const post = (body: object) => admin.as(request(app).post('/expert-cases')).send(body);

    const first = await post({ ...PRIVATE_SERVICE, serviceOrder: 'ts-2026-0001', phase: 'fees_received' });
    expect(first.status).toBe(201);
    expect(first.body.data.serviceOrder).toBe('TS-2026-0001');
    // Closed (fees received) still holds the number.
    expect((await post({ ...PRIVATE_SERVICE, serviceOrder: 'TS-2026-0001' })).status).toBe(409);
    // Deleted: the number stays used for good.
    expect((await admin.as(request(app).delete(`/expert-cases/${first.body.data.id}`))).status).toBe(200);
    const again = await post({ ...PRIVATE_SERVICE, serviceOrder: 'TS-2026-0001' });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe('service_order_taken');
    const other = await post({ ...PRIVATE_SERVICE, serviceOrder: 'TS-2026-0002' });
    expect(
      (await admin.as(request(app).patch(`/expert-cases/${other.body.data.id}`)).send({ serviceOrder: 'ts-2026-0001' }))
        .status,
    ).toBe(409);
  });

  it('filtros por fase, status, esfera, tipo, OS e período de entrega e data apagada (AD-177, AD-178)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const post = (body: object) => admin.as(request(app).post('/expert-cases')).send(body);

    const assistance = await post({
      role: 'technical_assistant',
      subject: 'Assistência ao perito X',
      contractor: { name: 'Perito X' },
      nominationDate: '2026-11-01',
      reportDeadline: '2026-12-10',
      status: 'suspended',
    });
    expect(assistance.status).toBe(201);
    const judicial = await post({
      ...JUDICIAL,
      serviceOrder: 'TS-2026-0017',
      reportDeadline: '2027-01-20',
      phase: 'awaiting_judge',
    });
    const own = await post({ ...PRIVATE_SERVICE, serviceOrder: 'TS-2026-0007' });
    expect([judicial.status, own.status]).toEqual([201, 201]);
    expect((await Deadline.findOne({ Case: assistance.body.data.id }).lean())?.title).toBe('Entrega do laudo');

    const ids = async (query: string) =>
      ((await admin.as(request(app).get(`/expert-cases?${query}`))).body.data.items as { id: string }[]).map(
        (item) => item.id,
      );
    expect(await ids('role=technical_assistant')).toEqual([assistance.body.data.id]);
    expect(await ids('role=court_expert')).toEqual([judicial.body.data.id]);
    expect(await ids(`serviceType=${encodeURIComponent(PRIVATE_SERVICE.serviceType)}`)).toEqual([own.body.data.id]);
    expect(await ids('courtType=labor')).toEqual([judicial.body.data.id]);
    // Número de controle: any piece of the OS (Atlas Search indexes asynchronously).
    await expect.poll(() => ids('serviceOrder=7')).toEqual([own.body.data.id, judicial.body.data.id]);
    expect(await ids('serviceOrder=0007')).toEqual([own.body.data.id]);
    expect(await ids('serviceOrder=2026-0017')).toEqual([judicial.body.data.id]);
    expect(await ids('serviceOrder=0008')).toEqual([]);
    expect(await ids('phase=awaiting_judge')).toEqual([judicial.body.data.id]);
    expect(await ids('status=suspended')).toEqual([assistance.body.data.id]);
    expect(await ids('deliveryFrom=2026-12-01&deliveryTo=2026-12-31')).toEqual([assistance.body.data.id]);
    expect(await ids('deliveryFrom=2027-01-01')).toEqual([judicial.body.data.id]);
    expect((await admin.as(request(app).get('/expert-cases?status=custom'))).status).toBe(400);

    // A date erased on screen is cleared with null.
    const cleared = await admin
      .as(request(app).patch(`/expert-cases/${assistance.body.data.id}`))
      .send({ nominationDate: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.nominationDate).toBeUndefined();
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
