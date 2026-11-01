import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import {
  Appointment,
  Case,
  connect,
  Deadline,
  disconnect,
  hashToken,
  newObjectId,
  Session,
  Tenant,
  User,
  wallClockToUtc,
} from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';
import { listDeadlineReminderRecipients } from '../identity/account.service.js';

const DEVICE = 'test-agent';
const app = buildApp();

let counter = 0;
const seed = async (role: Role[] = ['operator'], preferences?: { deadlineReminderEmail: boolean }) => {
  counter += 1;
  const tenant = await Tenant.create({
    name: `Escritório ${counter}`,
    document: `5555555500${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `feed-${counter}@x.com`,
    password: 'hash',
    Tenant: tenant._id,
    role,
    preferences,
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

describe('feed iCal (PRZ-03)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all(
      [Appointment, Deadline, Case, Session, User, Tenant].map((model) => (model as typeof User).deleteMany({})),
    );
  });
  afterAll(async () => {
    await disconnect();
  });

  it('gera o link (token mostrado uma vez), serve text/calendar com compromisso e prazo, e revogar invalida', async () => {
    const { tenant, as } = await seed();
    const legalCase = await Case.create({
      Tenant: tenant._id,
      processNumber: '0001234-56.2026.5.02.0001',
      courtType: 'labor',
      role: 'court_expert',
      court: 'TRT2',
      subject: 'Insalubridade',
      parties: [
        { Party: newObjectId(), side: 'plaintiff', tipo: 'party', nome: 'Maria' },
        { Party: newObjectId(), side: 'defendant', tipo: 'party', nome: 'Indústria' },
      ],
    });
    const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await Appointment.create({
      Tenant: tenant._id,
      tipo: 'inspection',
      titulo: 'Vistoria',
      inicio: wallClockToUtc(amanha, '09:00'),
      fim: wallClockToUtc(amanha, '10:00'),
      local: 'Rua A, 10',
      Case: legalCase._id,
    });
    await Appointment.create({
      Tenant: tenant._id,
      tipo: 'meeting',
      titulo: 'Reunião cancelada',
      inicio: wallClockToUtc(amanha, '11:00'),
      fim: wallClockToUtc(amanha, '12:00'),
      status: 'canceled',
    });
    await Deadline.create({ Tenant: tenant._id, Case: legalCase._id, titulo: 'Entrega do laudo', dueDate: amanha });

    expect((await as(request(app).get('/me/calendar-feed'))).body.data).toEqual({ active: false });
    const generated = await as(request(app).post('/me/calendar-feed'));
    expect(generated.status).toBe(201);
    const { token } = generated.body.data;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect((await as(request(app).get('/me/calendar-feed'))).body.data).toEqual({ active: true });

    const feed = await request(app).get(`/agenda/feed/${token}.ics`);
    expect(feed.status).toBe(200);
    expect(feed.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(feed.text).toContain('SUMMARY:Vistoria');
    expect(feed.text).toContain('LOCATION:Rua A\\, 10');
    expect(feed.text).toContain('SUMMARY:Prazo: Entrega do laudo');
    expect(feed.text).not.toContain('Reunião cancelada');

    // Gerar de novo troca o link: o anterior deixa de funcionar.
    const novo = (await as(request(app).post('/me/calendar-feed'))).body.data.token;
    expect((await request(app).get(`/agenda/feed/${token}.ics`)).status).toBe(404);
    expect((await request(app).get(`/agenda/feed/${novo}.ics`)).status).toBe(200);

    await as(request(app).delete('/me/calendar-feed'));
    expect((await request(app).get(`/agenda/feed/${novo}.ics`)).status).toBe(404);
  });

  it('tenant suspenso ou usuário inativo não serve o feed; token malformado é 400', async () => {
    const { tenant, user, as } = await seed();
    const { token } = (await as(request(app).post('/me/calendar-feed'))).body.data;

    await Tenant.updateOne({ _id: tenant._id }, { status: 'suspended' });
    expect((await request(app).get(`/agenda/feed/${token}.ics`)).status).toBe(404);

    await Tenant.updateOne({ _id: tenant._id }, { status: 'active' });
    await User.updateOne({ _id: user._id }, { active: false });
    expect((await request(app).get(`/agenda/feed/${token}.ics`)).status).toBe(404);

    expect((await request(app).get('/agenda/feed/nao-e-token.ics')).status).toBe(400);
  });
});

describe('preferência de aviso e destinatários (AD-110)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([Session.deleteMany({}), User.deleteMany({}), Tenant.deleteMany({})]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('aviso começa ligado, a pessoa desliga e deixa de ser destinatária; tenant suspenso não recebe', async () => {
    const ana = await seed(['operator']);
    const bia = await seed(['admin']);
    const suspenso = await seed(['admin']);
    await Tenant.updateOne({ _id: suspenso.tenant._id }, { status: 'suspended' });

    expect((await ana.as(request(app).get('/me/preferences'))).body.data).toEqual({
      onboardingDismissed: false,
      deadlineReminderEmail: true,
      blocosOcultos: [],
    });
    const desligado = await bia.as(request(app).patch('/me/preferences')).send({ deadlineReminderEmail: false });
    expect(desligado.body.data).toEqual({
      onboardingDismissed: false,
      deadlineReminderEmail: false,
      blocosOcultos: [],
    });

    const recipients = await listDeadlineReminderRecipients([ana.tenant.id, bia.tenant.id, suspenso.tenant.id]);
    expect(recipients.map((pessoa) => pessoa.email)).toEqual([ana.user.email]);
  });
});
