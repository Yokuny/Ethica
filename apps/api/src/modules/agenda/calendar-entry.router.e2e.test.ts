import crypto from 'node:crypto';
import type { Permissions, Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import {
  Appointment,
  CalendarEntry,
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
    document: `7777777700${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[], permissions?: Permissions) => {
  counter += 1;
  const user = await User.create({
    name: `Pessoa ${counter}`,
    email: `agenda-${counter}@x.com`,
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

const CASE = {
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
} as const;

const RANGE = '/agenda/entries?from=2026-12-01&to=2027-01-01';

describe('agenda por eventos (AEV-01 a AEV-04, AD-169)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Appointment.deleteMany({}),
      CalendarEntry.deleteMany({}),
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

  it('prazo, lançamento e recebimento entram na agenda, mudam junto e o financeiro só para quem vê o financeiro', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operator = await seedSession(tenant._id, ['operator']);
    const created = await admin.as(request(app).post('/expert-cases')).send({ ...CASE, reportDeadline: '2026-12-20' });
    const caseId = created.body.data.id as string;

    const fee = await admin.as(request(app).post('/finance/entries')).send({
      kind: 'income',
      category: 'advance_fees',
      description: 'Adiantamento',
      amountCents: 100_000,
      dueDate: '2026-12-05',
      caseId,
    });
    expect(fee.status).toBe(201);
    await admin
      .as(request(app).post(`/finance/entries/${fee.body.data.id}/installments`))
      .send({ amountCents: 40_000, date: '2026-12-07' });

    const types = async (as: typeof admin.as) =>
      ((await as(request(app).get(RANGE))).body.data as { type: string; status: string; date: string }[]).map(
        ({ type, status, date }) => `${date} ${type} ${status}`,
      );
    await expect
      .poll(() => types(admin.as))
      .toEqual(['2026-12-05 income open', '2026-12-07 receipt done', '2026-12-20 deadline open']);
    expect(await types(operator.as)).toEqual(['2026-12-20 deadline open']);

    const [deadline] = (await admin.as(request(app).get(`/expert-cases/${caseId}/deadlines`))).body.data;
    await admin.as(request(app).patch(`/expert-cases/deadlines/${deadline.id}`)).send({ status: 'filed' });
    await expect.poll(() => types(operator.as)).toEqual(['2026-12-20 deadline done']);

    await admin.as(request(app).delete(`/expert-cases/${caseId}`));
    await expect.poll(() => types(admin.as)).toEqual(['2026-12-05 income open', '2026-12-07 receipt done']);
  });

  it('a data da perícia na edição do serviço move o compromisso da perícia (AEV-04)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const created = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, inspection: { date: '2026-12-10', time: '09:30' } });
    const caseId = created.body.data.id as string;
    await expect.poll(() => Appointment.countDocuments({ Case: caseId })).toBe(1);

    await admin
      .as(request(app).patch(`/expert-cases/${caseId}`))
      .send({ inspection: { date: '2026-12-15', time: '14:00', location: 'Rua A, 10' } });
    await expect.poll(async () => (await Appointment.findOne({ Case: caseId }).lean())?.location).toBe('Rua A, 10');
    expect(await Appointment.countDocuments({ Case: caseId })).toBe(1);
  });
});
