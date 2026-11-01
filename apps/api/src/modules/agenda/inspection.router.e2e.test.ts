import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { INSPECTION_EMPTY_DATA } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import {
  Appointment,
  Case,
  connect,
  Deadline,
  disconnect,
  hashToken,
  Inspection,
  Party,
  Report,
  Session,
  Tenant,
  User,
} from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfDocument } from '../../providers/pdfRenderer.js';

const DEVICE = 'test-agent';
const objects = new Map<string, Buffer>();
const storage: FileStorage = {
  put: async (key, body) => {
    objects.set(key, body);
  },
  get: async (key) => objects.get(key) ?? null,
  remove: async (key) => {
    objects.delete(key);
  },
};
const sent: Array<{ to: string; subject: string; body: string }> = [];
const geocoded: string[] = [];
let rendered: PdfDocument | undefined;
const app = buildApp({
  storage,
  pdf: {
    render: async (document) => {
      rendered = document;
      return Buffer.from('%PDF-1.7 fake');
    },
  },
  mail: {
    send: async (to, subject, body) => {
      sent.push({ to, subject, body });
      return { sent: true };
    },
  },
  geocoder: {
    geocode: async (address) => {
      geocoded.push(address);
      return address.includes('inexistente') ? null : { lat: -23.55, lng: -46.63 };
    },
  },
});

// Minimal JPEG (SOI, APP0, SOF0 320×240, EOI).
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xf0, 0x01, 0x40, 0x03, 0x01,
  0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);

let counter = 0;
const seedTenant = async () => {
  counter += 1;
  return Tenant.create({
    name: `Escritório ${counter}`,
    document: `6666666600${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[]) => {
  counter += 1;
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `field-${counter}@x.com`,
    password: 'hash-secreto',
    Tenant: tenantId,
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
  return { user, as };
};

const CASE = {
  processNumber: '0008888-22.2026.5.02.0003',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  division: '3ª Vara do Trabalho de São Paulo',
  subject: 'Insalubridade',
};

const DATA = {
  ...INSPECTION_EMPTY_DATA,
  attendees: [{ id: 'a', name: 'Ana Reclamante', capacity: 'plaintiff', email: 'ana@x.com' }],
  agents: [{ agent: 'noise', present: 'yes', ppe: 'protetor auricular' }],
  documents: [{ id: 'd', document: 'ltcat', requested: true }],
};

const media = () => crypto.randomUUID();

describe('campo e vistorias (CAM-01..09)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    objects.clear();
    sent.length = 0;
    geocoded.length = 0;
    rendered = undefined;
    await Promise.all([
      Inspection.deleteMany({}),
      Report.deleteMany({}),
      Appointment.deleteMany({}),
      Deadline.deleteMany({}),
      Party.deleteMany({}),
      Case.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  const prepare = async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operator = await seedSession(tenant._id, ['operator']);
    // The e-mail lives in the party record (AD-117); the case links it by id.
    const cadastrar = async (data: Record<string, string>) =>
      (await admin.as(request(app).post('/parties')).send(data)).body.data.id as string;
    const ana = await cadastrar({ type: 'party', name: 'Ana Reclamante', email: 'ana@x.com' });
    const metal = await cadastrar({ type: 'party', name: 'Metal Ltda' });
    const dra = await cadastrar({ type: 'lawyer', name: 'Dra. Ré', oab: 'SP123456', email: 'dra@x.com' });
    const legalCase = await admin.as(request(app).post('/expert-cases')).send({
      ...CASE,
      parties: [
        { partyId: ana, side: 'plaintiff', type: 'party', name: 'Ana Reclamante' },
        { partyId: metal, side: 'defendant', type: 'party', name: 'Metal Ltda' },
        { partyId: dra, side: 'defendant', type: 'lawyer', name: 'Dra. Ré' },
      ],
    });
    const appointment = await operator.as(request(app).post('/agenda')).send({
      type: 'inspection',
      title: 'Vistoria na fábrica',
      date: '2026-11-10',
      time: '09:30',
      durationMinutes: 120,
      location: 'Av. Industrial, 1500, São Paulo',
      caseId: legalCase.body.data.id,
    });
    return {
      tenant,
      admin,
      operator,
      caseId: legalCase.body.data.id as string,
      id: appointment.body.data.id as string,
    };
  };

  it('rota do dia, registro com versão (409 no conflito) e status rápido com motivo', async () => {
    const { operator, id } = await prepare();
    const day = await operator.as(request(app).get('/inspections/day?date=2026-11-10'));
    expect(day.status).toBe(200);
    expect(day.body.data).toEqual([
      expect.objectContaining({
        appointment: expect.objectContaining({ id, title: 'Vistoria na fábrica' }),
        legalCase: expect.objectContaining({ processNumber: CASE.processNumber, plaintiff: 'Ana Reclamante' }),
        inspection: expect.objectContaining({ version: 0 }),
      }),
    ]);

    const first = await operator.as(request(app).put(`/inspections/${id}`)).send({ version: 0, data: DATA });
    expect(first.status).toBe(200);
    expect(first.body.data.version).toBe(1);
    const segunda = await operator
      .as(request(app).put(`/inspections/${id}`))
      .send({ version: 1, data: { ...DATA, notes: 'segunda' } });
    expect(segunda.body.data.version).toBe(2);
    // Device with the old version: 409 with the server version, nothing overwritten.
    const velha = await operator
      .as(request(app).put(`/inspections/${id}`))
      .send({ version: 1, data: { ...DATA, notes: 'velha' } });
    expect(velha.status).toBe(409);
    expect(velha.body).toMatchObject({ success: false, message: 'inspection_conflict' });
    expect(velha.body.data).toMatchObject({ version: 2, data: { notes: 'segunda' } });
    const invalida = await operator
      .as(request(app).put(`/inspections/${id}`))
      .send({ version: 2, data: { ...DATA, witnesses: [] } });
    expect(invalida.status).toBe(400);

    const absent = await operator
      .as(request(app).patch(`/agenda/${id}`))
      .send({ status: 'canceled', reason: 'absent' });
    expect(absent.body.data).toMatchObject({ status: 'canceled', reason: 'absent' });
    const done = await operator.as(request(app).patch(`/agenda/${id}`)).send({ status: 'done' });
    expect(done.body.data.status).toBe('done');
    expect(done.body.data.reason).toBeUndefined();
  });

  it('mídia: idempotente pelo id, limite de tipo, cota reservada e devolvida, exclusão do compromisso leva tudo', async () => {
    const { tenant, operator, id } = await prepare();
    const photoId = media();
    const envio = () =>
      operator
        .as(request(app).put(`/inspections/${id}/media/${photoId}?type=photo&caption=Prensa`))
        .set('Content-Type', 'image/jpeg')
        .send(JPEG);
    const photo = await envio();
    expect(photo.status).toBe(200);
    expect(photo.body.data).toMatchObject({ id: photoId, type: 'photo', bytes: JPEG.length, caption: 'Prensa' });
    expect((await envio()).status).toBe(200);
    const record = await operator.as(request(app).get(`/inspections/${id}`));
    expect(record.body.data.inspection.media).toHaveLength(1);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(JPEG.length);

    const bytes = await operator.as(request(app).get(`/inspections/${id}/media/${photoId}`));
    expect(bytes.headers['content-type']).toBe('image/jpeg');
    const wrongType = await operator
      .as(request(app).put(`/inspections/${id}/media/${media()}?type=photo`))
      .set('Content-Type', 'image/png')
      .send(JPEG);
    expect(wrongType.status).toBe(415);

    await Tenant.updateOne({ _id: tenant._id }, { storageBytes: 1024 * 1024 * 1024 });
    const semCota = await operator
      .as(request(app).put(`/inspections/${id}/media/${media()}?type=photo`))
      .set('Content-Type', 'image/jpeg')
      .send(JPEG);
    expect(semCota.body.message).toBe('storage_quota_exceeded');
    await Tenant.updateOne({ _id: tenant._id }, { storageBytes: JPEG.length });

    const caption = await operator
      .as(request(app).patch(`/inspections/${id}/media/${photoId}`))
      .send({ caption: 'Prensa 2' });
    expect(caption.body.data.inspection.media[0].caption).toBe('Prensa 2');
    expect((await operator.as(request(app).delete(`/inspections/${id}/media/${photoId}`))).status).toBe(200);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(0);
    expect(objects.size).toBe(0);

    await envio();
    await operator.as(request(app).delete(`/agenda/${id}`)).expect(200);
    expect(await Inspection.countDocuments({ Appointment: id })).toBe(0);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('geocodificação com cache e aviso por e-mail só a quem tem e-mail, com registro', async () => {
    const { operator, id } = await prepare();
    const geo = await operator.as(request(app).post(`/agenda/${id}/geocode`));
    expect(geo.body.data.coordinates).toEqual({ lat: -23.55, lng: -46.63 });
    await operator.as(request(app).post(`/agenda/${id}/geocode`));
    expect(geocoded).toHaveLength(1);
    // A new address invalidates the cache.
    await operator.as(request(app).patch(`/agenda/${id}`)).send({ location: 'Rua inexistente, 1' });
    const withoutPoint = await operator.as(request(app).post(`/agenda/${id}/geocode`));
    expect(withoutPoint.body.data.coordinates).toBeUndefined();

    const notice = await operator.as(request(app).post(`/agenda/${id}/notice`));
    expect(notice.status).toBe(200);
    expect(sent.map((email) => email.to).sort()).toEqual(['ana@x.com', 'dra@x.com']);
    expect(sent[0]?.subject).toContain(CASE.processNumber);
    expect(sent[0]?.body).toContain('10/11/2026');
    expect(sent[0]?.body).toContain('09:30');
    expect(notice.body.data.notices).toEqual([
      expect.objectContaining({ recipients: expect.arrayContaining(['ana@x.com', 'dra@x.com']) }),
    ]);

    const withoutCase = await operator.as(request(app).post('/agenda')).send({
      type: 'meeting',
      title: 'Reunião',
      date: '2026-11-10',
      time: '14:00',
      durationMinutes: 30,
    });
    const declined = await operator.as(request(app).post(`/agenda/${withoutCase.body.data.id}/notice`));
    expect(declined.body.message).toBe('inspection_requires_case');
  });

  it('modelo do aviso: só admin edita; o envio usa o modelo do escritório', async () => {
    const { admin, operator, id } = await prepare();
    expect((await operator.as(request(app).get('/tenant/office/schedule-notice'))).status).toBe(403);
    const isDefault = await admin.as(request(app).get('/tenant/office/schedule-notice'));
    expect(isDefault.body.data.body).toContain('[ENDERECO]');
    await admin
      .as(request(app).put('/tenant/office/schedule-notice'))
      .send({ subject: 'Vistoria [NUMERO_PROCESSO]', body: 'Dia [DATA] às [HORA] em [ENDERECO]. [NOME_PERITO]' })
      .expect(200);
    await operator.as(request(app).post(`/agenda/${id}/notice`)).expect(200);
    expect(sent[0]).toMatchObject({
      subject: `Vistoria ${CASE.processNumber}`,
      body: expect.stringMatching(/^Dia 10\/11\/2026 às 09:30 em Av\. Industrial, 1500, São Paulo\. Perito \d+$/),
    });
  });

  it('laudo: variáveis da última vistoria feita e foto da vistoria no PDF e no Word', async () => {
    const { operator, id, caseId } = await prepare();
    await operator
      .as(request(app).put(`/inspections/${id}`))
      .send({ version: 0, data: DATA })
      .expect(200);
    const photoId = media();
    await operator
      .as(request(app).put(`/inspections/${id}/media/${photoId}?type=photo&caption=Prensa`))
      .set('Content-Type', 'image/jpeg')
      .send(JPEG)
      .expect(200);
    const { body: template } = await operator.as(request(app).get('/expert-reports/templates/standard-report'));
    const encerramento = template.data.sections.find((section: { title: string }) => section.title === 'Encerramento');
    const report = await operator.as(request(app).post('/expert-reports')).send({
      caseId,
      templateId: 'standard-report',
      sections: [{ id: encerramento.id, variant: 'no' }],
    });
    const sectionId = report.body.data.sections[0].id;
    const withField = await operator
      .as(request(app).patch(`/expert-reports/${report.body.data.id}/sections/${sectionId}`))
      .send({
        html: `<p>Presentes: [PRESENTES_VISTORIA]. Agentes: [AGENTES_PRESENTES]. Documentos: [DOCUMENTOS_SOLICITADOS].</p><img src="http://localhost:18080/inspections/${id}/media/${photoId}" alt="Prensa"><img src="https://evil.com/x.png">`,
      });
    // Inspection still scheduled: field variables pending.
    expect(withField.body.data.issues[0].variables).toContain('[PRESENTES_VISTORIA]');
    await operator
      .as(request(app).patch(`/agenda/${id}`))
      .send({ status: 'done' })
      .expect(200);
    const reaberto = await operator.as(request(app).get(`/expert-reports/${report.body.data.id}`));
    expect(reaberto.body.data.issues).toEqual([]);
    expect(reaberto.body.data.sections[0].html).toContain(
      'Presentes: Ana Reclamante (Reclamante). Agentes: Ruído (EPI: protetor auricular). Documentos: LTCAT.',
    );
    expect(reaberto.body.data.sections[0].html).toContain(
      `<img src="/inspections/${id}/media/${photoId}" alt="Prensa" />`,
    );
    expect(reaberto.body.data.sections[0].html).not.toContain('evil.com');

    await operator.as(request(app).get(`/expert-reports/${report.body.data.id}/pdf`)).expect(200);
    expect(rendered?.html).toContain(`data:image/jpeg;base64,${JPEG.toString('base64')}`);
    const docx = await operator.as(request(app).get(`/expert-reports/${report.body.data.id}/docx`));
    expect(docx.status).toBe(200);
  });
});
