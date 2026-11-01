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
  Laudo,
  Party,
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
const enviados: Array<{ to: string; subject: string; body: string }> = [];
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
      enviados.push({ to, subject, body });
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

// JPEG mínimo (SOI, APP0, SOF0 320×240, EOI).
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

const DADOS = {
  ...INSPECTION_EMPTY_DATA,
  attendees: [{ id: 'a', nome: 'Ana Reclamante', capacity: 'plaintiff', email: 'ana@x.com' }],
  agents: [{ agent: 'noise', present: 'yes', ppe: 'protetor auricular' }],
  documentos: [{ id: 'd', documento: 'ltcat', requested: true }],
};

const media = () => crypto.randomUUID();

describe('campo e vistorias (CAM-01..09)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    objects.clear();
    enviados.length = 0;
    geocoded.length = 0;
    rendered = undefined;
    await Promise.all([
      Inspection.deleteMany({}),
      Laudo.deleteMany({}),
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

  const preparar = async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operador = await seedSession(tenant._id, ['operator']);
    // E-mail fica no cadastro da parte (AD-117); a perícia liga pelo id.
    const cadastrar = async (dados: Record<string, string>) =>
      (await admin.as(request(app).post('/parties')).send(dados)).body.data.id as string;
    const ana = await cadastrar({ tipo: 'party', nome: 'Ana Reclamante', email: 'ana@x.com' });
    const metal = await cadastrar({ tipo: 'party', nome: 'Metal Ltda' });
    const dra = await cadastrar({ tipo: 'lawyer', nome: 'Dra. Ré', oab: 'SP123456', email: 'dra@x.com' });
    const legalCase = await admin.as(request(app).post('/expert-cases')).send({
      ...CASE,
      parties: [
        { partyId: ana, side: 'plaintiff', tipo: 'party', nome: 'Ana Reclamante' },
        { partyId: metal, side: 'defendant', tipo: 'party', nome: 'Metal Ltda' },
        { partyId: dra, side: 'defendant', tipo: 'lawyer', nome: 'Dra. Ré' },
      ],
    });
    const appointment = await operador.as(request(app).post('/agenda')).send({
      tipo: 'inspection',
      titulo: 'Vistoria na fábrica',
      date: '2026-11-10',
      time: '09:30',
      durationMinutes: 120,
      local: 'Av. Industrial, 1500, São Paulo',
      caseId: legalCase.body.data.id,
    });
    return {
      tenant,
      admin,
      operador,
      caseId: legalCase.body.data.id as string,
      id: appointment.body.data.id as string,
    };
  };

  it('rota do dia, registro com versão (409 no conflito) e status rápido com motivo', async () => {
    const { operador, id } = await preparar();
    const day = await operador.as(request(app).get('/inspections/day?date=2026-11-10'));
    expect(day.status).toBe(200);
    expect(day.body.data).toEqual([
      expect.objectContaining({
        appointment: expect.objectContaining({ id, titulo: 'Vistoria na fábrica' }),
        legalCase: expect.objectContaining({ processNumber: CASE.processNumber, plaintiff: 'Ana Reclamante' }),
        inspection: expect.objectContaining({ versao: 0 }),
      }),
    ]);

    const primeira = await operador.as(request(app).put(`/inspections/${id}`)).send({ versao: 0, dados: DADOS });
    expect(primeira.status).toBe(200);
    expect(primeira.body.data.versao).toBe(1);
    const segunda = await operador
      .as(request(app).put(`/inspections/${id}`))
      .send({ versao: 1, dados: { ...DADOS, observacoes: 'segunda' } });
    expect(segunda.body.data.versao).toBe(2);
    // Aparelho com a versão antiga: 409 com a versão do servidor, nada sobrescrito.
    const velha = await operador
      .as(request(app).put(`/inspections/${id}`))
      .send({ versao: 1, dados: { ...DADOS, observacoes: 'velha' } });
    expect(velha.status).toBe(409);
    expect(velha.body).toMatchObject({ success: false, message: 'inspection_conflict' });
    expect(velha.body.data).toMatchObject({ versao: 2, dados: { observacoes: 'segunda' } });
    const invalida = await operador
      .as(request(app).put(`/inspections/${id}`))
      .send({ versao: 2, dados: { ...DADOS, witnesses: [] } });
    expect(invalida.status).toBe(400);

    const absent = await operador
      .as(request(app).patch(`/agenda/${id}`))
      .send({ status: 'canceled', reason: 'absent' });
    expect(absent.body.data).toMatchObject({ status: 'canceled', reason: 'absent' });
    const done = await operador.as(request(app).patch(`/agenda/${id}`)).send({ status: 'done' });
    expect(done.body.data.status).toBe('done');
    expect(done.body.data.reason).toBeUndefined();
  });

  it('mídia: idempotente pelo id, limite de tipo, cota reservada e devolvida, exclusão do compromisso leva tudo', async () => {
    const { tenant, operador, id } = await preparar();
    const photoId = media();
    const envio = () =>
      operador
        .as(request(app).put(`/inspections/${id}/media/${photoId}?tipo=photo&caption=Prensa`))
        .set('Content-Type', 'image/jpeg')
        .send(JPEG);
    const photo = await envio();
    expect(photo.status).toBe(200);
    expect(photo.body.data).toMatchObject({ id: photoId, tipo: 'photo', bytes: JPEG.length, caption: 'Prensa' });
    expect((await envio()).status).toBe(200);
    const registro = await operador.as(request(app).get(`/inspections/${id}`));
    expect(registro.body.data.inspection.media).toHaveLength(1);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(JPEG.length);

    const bytes = await operador.as(request(app).get(`/inspections/${id}/media/${photoId}`));
    expect(bytes.headers['content-type']).toBe('image/jpeg');
    const wrongType = await operador
      .as(request(app).put(`/inspections/${id}/media/${media()}?tipo=photo`))
      .set('Content-Type', 'image/png')
      .send(JPEG);
    expect(wrongType.status).toBe(415);

    await Tenant.updateOne({ _id: tenant._id }, { storageBytes: 1024 * 1024 * 1024 });
    const semCota = await operador
      .as(request(app).put(`/inspections/${id}/media/${media()}?tipo=photo`))
      .set('Content-Type', 'image/jpeg')
      .send(JPEG);
    expect(semCota.body.message).toBe('storage_quota_exceeded');
    await Tenant.updateOne({ _id: tenant._id }, { storageBytes: JPEG.length });

    const caption = await operador
      .as(request(app).patch(`/inspections/${id}/media/${photoId}`))
      .send({ caption: 'Prensa 2' });
    expect(caption.body.data.inspection.media[0].caption).toBe('Prensa 2');
    expect((await operador.as(request(app).delete(`/inspections/${id}/media/${photoId}`))).status).toBe(200);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(0);
    expect(objects.size).toBe(0);

    await envio();
    await operador.as(request(app).delete(`/agenda/${id}`)).expect(200);
    expect(await Inspection.countDocuments({ Appointment: id })).toBe(0);
    expect((await Tenant.findById(tenant._id).lean())?.storageBytes).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('geocodificação com cache e aviso por e-mail só a quem tem e-mail, com registro', async () => {
    const { operador, id } = await preparar();
    const geo = await operador.as(request(app).post(`/agenda/${id}/geocode`));
    expect(geo.body.data.coordinates).toEqual({ lat: -23.55, lng: -46.63 });
    await operador.as(request(app).post(`/agenda/${id}/geocode`));
    expect(geocoded).toHaveLength(1);
    // Endereço novo invalida o cache.
    await operador.as(request(app).patch(`/agenda/${id}`)).send({ local: 'Rua inexistente, 1' });
    const semPonto = await operador.as(request(app).post(`/agenda/${id}/geocode`));
    expect(semPonto.body.data.coordinates).toBeUndefined();

    const notice = await operador.as(request(app).post(`/agenda/${id}/notice`));
    expect(notice.status).toBe(200);
    expect(enviados.map((email) => email.to).sort()).toEqual(['ana@x.com', 'dra@x.com']);
    expect(enviados[0]?.subject).toContain(CASE.processNumber);
    expect(enviados[0]?.body).toContain('10/11/2026');
    expect(enviados[0]?.body).toContain('09:30');
    expect(notice.body.data.notices).toEqual([
      expect.objectContaining({ recipients: expect.arrayContaining(['ana@x.com', 'dra@x.com']) }),
    ]);

    const withoutCase = await operador.as(request(app).post('/agenda')).send({
      tipo: 'meeting',
      titulo: 'Reunião',
      date: '2026-11-10',
      time: '14:00',
      durationMinutes: 30,
    });
    const recusado = await operador.as(request(app).post(`/agenda/${withoutCase.body.data.id}/notice`));
    expect(recusado.body.message).toBe('inspection_requires_case');
  });

  it('modelo do aviso: só admin edita; o envio usa o modelo do escritório', async () => {
    const { admin, operador, id } = await preparar();
    expect((await operador.as(request(app).get('/tenant/office/schedule-notice'))).status).toBe(403);
    const padrao = await admin.as(request(app).get('/tenant/office/schedule-notice'));
    expect(padrao.body.data.corpo).toContain('[ENDERECO]');
    await admin
      .as(request(app).put('/tenant/office/schedule-notice'))
      .send({ assunto: 'Vistoria [NUMERO_PROCESSO]', corpo: 'Dia [DATA] às [HORA] em [ENDERECO]. [NOME_PERITO]' })
      .expect(200);
    await operador.as(request(app).post(`/agenda/${id}/notice`)).expect(200);
    expect(enviados[0]).toMatchObject({
      subject: `Vistoria ${CASE.processNumber}`,
      body: expect.stringMatching(/^Dia 10\/11\/2026 às 09:30 em Av\. Industrial, 1500, São Paulo\. Perito \d+$/),
    });
  });

  it('laudo: variáveis da última vistoria feita e foto da vistoria no PDF e no Word', async () => {
    const { operador, id, caseId } = await preparar();
    await operador
      .as(request(app).put(`/inspections/${id}`))
      .send({ versao: 0, dados: DADOS })
      .expect(200);
    const photoId = media();
    await operador
      .as(request(app).put(`/inspections/${id}/media/${photoId}?tipo=photo&caption=Prensa`))
      .set('Content-Type', 'image/jpeg')
      .send(JPEG)
      .expect(200);
    const { body: modelo } = await operador.as(request(app).get('/expert-reports/templates/standard-report'));
    const encerramento = modelo.data.secoes.find((secao: { titulo: string }) => secao.titulo === 'Encerramento');
    const laudo = await operador.as(request(app).post('/expert-reports')).send({
      caseId,
      modeloId: 'standard-report',
      secoes: [{ id: encerramento.id, variante: 'no' }],
    });
    const secaoId = laudo.body.data.secoes[0].id;
    const withField = await operador
      .as(request(app).patch(`/expert-reports/${laudo.body.data.id}/sections/${secaoId}`))
      .send({
        html: `<p>Presentes: [PRESENTES_VISTORIA]. Agentes: [AGENTES_PRESENTES]. Documentos: [DOCUMENTOS_SOLICITADOS].</p><img src="http://localhost:18080/inspections/${id}/media/${photoId}" alt="Prensa"><img src="https://evil.com/x.png">`,
      });
    // Vistoria ainda agendada: variáveis de campo pendentes.
    expect(withField.body.data.pendencias[0].variaveis).toContain('[PRESENTES_VISTORIA]');
    await operador
      .as(request(app).patch(`/agenda/${id}`))
      .send({ status: 'done' })
      .expect(200);
    const reaberto = await operador.as(request(app).get(`/expert-reports/${laudo.body.data.id}`));
    expect(reaberto.body.data.pendencias).toEqual([]);
    expect(reaberto.body.data.secoes[0].html).toContain(
      'Presentes: Ana Reclamante (Reclamante). Agentes: Ruído (EPI: protetor auricular). Documentos: LTCAT.',
    );
    expect(reaberto.body.data.secoes[0].html).toContain(
      `<img src="/inspections/${id}/media/${photoId}" alt="Prensa" />`,
    );
    expect(reaberto.body.data.secoes[0].html).not.toContain('evil.com');

    await operador.as(request(app).get(`/expert-reports/${laudo.body.data.id}/pdf`)).expect(200);
    expect(rendered?.html).toContain(`data:image/jpeg;base64,${JPEG.toString('base64')}`);
    const docx = await operador.as(request(app).get(`/expert-reports/${laudo.body.data.id}/docx`));
    expect(docx.status).toBe(200);
  });
});
