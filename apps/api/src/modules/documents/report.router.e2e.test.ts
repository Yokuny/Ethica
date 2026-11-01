import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import {
  Case,
  connect,
  Deadline,
  dateInDisplayTz,
  disconnect,
  hashToken,
  Party,
  Report,
  Session,
  Template,
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
let rendered: PdfDocument | undefined;
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
// Minimal JPEG (SOI, APP0, SOF0 320×240, EOI).
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xf0, 0x01, 0x40, 0x03, 0x01,
  0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);
const app = buildApp({
  pdf: {
    render: async (document) => {
      rendered = document;
      return Buffer.from('%PDF-1.7 fake');
    },
  },
  storage,
});

const binary = (res: request.Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

let counter = 0;
const seedTenant = async () => {
  counter += 1;
  return Tenant.create({
    name: `Escritório ${counter}`,
    document: `7777777700${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[]) => {
  counter += 1;
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `report-${counter}@x.com`,
    password: 'hash-secreto',
    Tenant: tenantId,
    role,
    professionalRegistration: 'CREA-SP 555',
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
  processNumber: '0007777-11.2026.5.15.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT15',
  division: '1ª Vara do Trabalho de Campinas',
  subject: 'Insalubridade',
};

type Section = { id: string; title: string };
const sectionByTitle = (sections: Section[], title: string): Section => {
  const section = sections.find((item) => item.title === title);
  if (!section) throw new Error(`seção ${title} não existe`);
  return section;
};

describe('laudos (LAU-01..03, 05, 06)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    rendered = undefined;
    await Promise.all([
      Report.deleteMany({}),
      Template.deleteMany({}),
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

  it('modelos: padrão para todos e só leitura; admin/manager clonam e editam seções saneadas; operador 403', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const manager = await seedSession(tenant._id, ['manager']);

    const list = await operator.as(request(app).get('/expert-reports/templates?type=report'));
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([expect.objectContaining({ id: 'standard-report', isDefault: true })]);
    const isDefault = await operator.as(request(app).get('/expert-reports/templates/standard-report'));
    expect(isDefault.body.data.sections.length).toBeGreaterThan(30);

    const negado = await operator
      .as(request(app).post('/expert-reports/templates'))
      .send({ name: 'Meu', type: 'report' });
    expect(negado.status).toBe(403);
    const renameDefault = await manager
      .as(request(app).patch('/expert-reports/templates/standard-report'))
      .send({ name: 'X' });
    expect(renameDefault.status).toBe(403);
    expect(renameDefault.body.message).toBe('standard_template_read_only');

    const clone = await manager
      .as(request(app).post('/expert-reports/templates'))
      .send({ name: 'Insalubridade do escritório', type: 'report', baseId: 'standard-report' });
    expect(clone.status).toBe(201);
    expect(clone.body.data.sections).toHaveLength(isDefault.body.data.sections.length);
    const wrongType = await manager
      .as(request(app).post('/expert-reports/templates'))
      .send({ name: 'Errado', type: 'technical_opinion', baseId: 'standard-report' });
    expect(wrongType.status).toBe(422);

    const templateId = clone.body.data.id;
    const fresh = await manager.as(request(app).post(`/expert-reports/templates/${templateId}/sections`)).send({
      title: 'Anexo fotográfico',
      level: 1,
      titleOnly: false,
      pageBreak: true,
      yesText: '<p onclick="x()">Fotos <script>alert(1)</script><a href="http://x">aqui</a></p>',
      noText: '<p>Sem fotos</p>',
    });
    expect(fresh.status).toBe(201);
    const added = fresh.body.data.sections.at(-1);
    expect(added.yesText).toBe('<p>Fotos aqui</p>');

    const movida = await manager
      .as(request(app).post(`/expert-reports/templates/${templateId}/sections/${added.id}/move`))
      .send({ direction: 'up' });
    expect(movida.body.data.sections.at(-2).id).toBe(added.id);
    const removida = await manager.as(
      request(app).delete(`/expert-reports/templates/${templateId}/sections/${added.id}`),
    );
    expect(removida.body.data.sections).toHaveLength(isDefault.body.data.sections.length);

    const ofOffice = await operator.as(request(app).get('/expert-reports/templates?type=report'));
    expect(ofOffice.body.data).toHaveLength(2);
  });

  it('laudo: cria com variáveis resolvidas, bloqueia com pendência, conclui com a entrega e fica só leitura', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operator = await seedSession(tenant._id, ['operator']);
    const legalCase = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, reportDeadline: '2026-12-01' });
    const caseId = legalCase.body.data.id;
    const { body: template } = await operator.as(request(app).get('/expert-reports/templates/standard-report'));
    const identification = sectionByTitle(template.data.sections, 'Identificação do processo');
    const conclusao = sectionByTitle(template.data.sections, 'Conclusão');
    const encerramento = sectionByTitle(template.data.sections, 'Encerramento');

    const created = await operator.as(request(app).post('/expert-reports')).send({
      caseId,
      templateId: 'standard-report',
      sections: [
        { id: encerramento.id, variant: 'no' },
        { id: identification.id, variant: 'yes' },
        { id: conclusao.id, variant: 'no' },
      ],
    });
    expect(created.status).toBe(201);
    const report = created.body.data;
    expect(report).toMatchObject({ type: 'report', status: 'draft', caseNumber: CASE.processNumber });
    // Template order, not the order of the selection.
    expect(report.sections.map((section: Section) => section.title)).toEqual([
      'Identificação do processo',
      'Conclusão',
      'Encerramento',
    ]);
    expect(report.sections[0].html).toContain(CASE.processNumber);
    expect(report.sections[0].html).toContain('Reclamante');
    expect(report.sections[0].html).toContain('[NOME_AUTOR]');
    expect(report.issues.map((p: { sectionId: string }) => p.sectionId)).toEqual([
      report.sections[0].id,
      report.sections[1].id,
    ]);

    // Data filled on the case after the report was created resolves when the draft is reopened.
    expect(report.sections[1].html).toContain('[PERIODO_IMPRESCRITO]');
    await admin
      .as(request(app).patch(`/expert-cases/${caseId}`))
      .send({ nonPrescribedPeriodStart: '2021-01-04', nonPrescribedPeriodEnd: '2024-05-31' })
      .expect(200);
    const reaberto = await operator.as(request(app).get(`/expert-reports/${report.id}`));
    expect(reaberto.body.data.sections[1].html).toContain('04/01/2021 a 31/05/2024');
    expect(reaberto.body.data.issues).toEqual([
      { sectionId: report.sections[0].id, variables: ['[NOME_AUTOR]', '[NOME_REU]'] },
      { sectionId: report.sections[1].id, variables: ['[NOME_AUTOR]'] },
    ]);

    const bloqueado = await operator
      .as(request(app).post(`/expert-reports/${report.id}/complete`))
      .send({ recordDelivery: true });
    expect(bloqueado.status).toBe(422);
    expect(bloqueado.body.message).toBe('report_unresolved_variables');
    const pdfBloqueado = await operator.as(request(app).get(`/expert-reports/${report.id}/pdf`));
    expect(pdfBloqueado.status).toBe(422);
    // The preview leaves with the pending markers visible (LMO-04).
    const preview = await operator.as(request(app).get(`/expert-reports/${report.id}/pdf?preview=true`));
    expect(preview.status).toBe(200);
    expect(rendered?.html).toContain('[NOME_AUTOR]');

    for (const section of report.sections.slice(0, 2)) {
      const editada = await operator
        .as(request(app).patch(`/expert-reports/${report.id}/sections/${section.id}`))
        .send({ html: '<p>Texto revisado pelo perito.</p>' });
      expect(editada.status).toBe(200);
    }
    const removida = await operator.as(
      request(app).delete(`/expert-reports/${report.id}/sections/${report.sections[1].id}`),
    );
    expect(removida.body.data.sections).toHaveLength(2);
    expect(removida.body.data.issues).toEqual([]);

    const pdf = await operator
      .as(request(app).get(`/expert-reports/${report.id}/pdf`))
      .buffer()
      .parse(binary);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-disposition']).toContain(`report-${CASE.processNumber}.pdf`);
    expect(rendered?.html).toContain('LAUDO PERICIAL');
    expect(rendered?.html).toContain('2. Encerramento');
    const docx = await operator
      .as(request(app).get(`/expert-reports/${report.id}/docx`))
      .buffer()
      .parse(binary);
    expect(docx.status).toBe(200);
    expect((docx.body as Buffer).subarray(0, 2).toString()).toBe('PK');

    const completed = await operator
      .as(request(app).post(`/expert-reports/${report.id}/complete`))
      .send({ recordDelivery: true });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('completed');
    const today = dateInDisplayTz(new Date());
    const deadline = await Deadline.findOne({ Case: caseId }).lean();
    expect(deadline).toMatchObject({ status: 'filed', filedDate: today });
    const depois = await operator.as(request(app).get(`/expert-cases/${caseId}`));
    expect(depois.body.data.status).toBe('report_delivered');
    expect(depois.body.data.movements).toEqual([expect.objectContaining({ type: 'report_filed', date: today })]);

    const editCompleted = await operator
      .as(request(app).patch(`/expert-reports/${report.id}/sections/${report.sections[0].id}`))
      .send({ html: '<p>x</p>' });
    expect(editCompleted.status).toBe(409);
    expect(editCompleted.body.message).toBe('report_completed');
    expect((await operator.as(request(app).delete(`/expert-reports/${report.id}`))).status).toBe(409);
  });

  it('seções do modelo no rascunho: mantém o texto editado, acrescenta na ordem do modelo e troca o modelo (LMO-01)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const legalCase = await admin.as(request(app).post('/expert-cases')).send(CASE);
    const { body: template } = await admin.as(request(app).get('/expert-reports/templates/standard-report'));
    const identification = sectionByTitle(template.data.sections, 'Identificação do processo');
    const objective = sectionByTitle(template.data.sections, 'Objetivo');
    const conclusion = sectionByTitle(template.data.sections, 'Conclusão');
    const created = await admin.as(request(app).post('/expert-reports')).send({
      caseId: legalCase.body.data.id,
      templateId: 'standard-report',
      sections: [
        { id: identification.id, variant: 'yes' },
        { id: conclusion.id, variant: 'yes' },
      ],
    });
    const report = created.body.data;
    expect(report.templateId).toBe('standard-report');
    await admin
      .as(request(app).patch(`/expert-reports/${report.id}/sections/${report.sections[0].id}`))
      .send({ html: '<p>Texto do perito.</p>' })
      .expect(200);

    const chosen = await admin.as(request(app).put(`/expert-reports/${report.id}/sections`)).send({
      templateId: 'standard-report',
      sections: [
        { id: identification.id, variant: 'yes' },
        { id: objective.id, variant: 'yes' },
      ],
    });
    expect(chosen.status).toBe(200);
    expect(chosen.body.data.sections.map((section: Section) => section.title)).toEqual([
      'Identificação do processo',
      'Objetivo',
    ]);
    expect(chosen.body.data.sections[0]).toMatchObject({ id: report.sections[0].id, html: '<p>Texto do perito.</p>' });

    const clone = await admin
      .as(request(app).post('/expert-reports/templates'))
      .send({ name: 'Meu modelo', type: 'report', baseId: 'standard-report' });
    const cloneIdentification = sectionByTitle(clone.body.data.sections, 'Identificação do processo');
    const switched = await admin.as(request(app).put(`/expert-reports/${report.id}/sections`)).send({
      templateId: clone.body.data.id,
      sections: [{ id: cloneIdentification.id, variant: 'no' }],
    });
    expect(switched.body.data).toMatchObject({ templateId: clone.body.data.id, templateName: 'Meu modelo' });
    expect(switched.body.data.sections).toHaveLength(1);
    expect(switched.body.data.sections[0].html).not.toContain('Texto do perito');

    const wrongType = await admin.as(request(app).put(`/expert-reports/${report.id}/sections`)).send({
      templateId: 'standard-technical_opinion',
      sections: [{ id: 'parecer-01', variant: 'yes' }],
    });
    expect(wrongType.status).toBe(422);
  });

  it('fotos enviadas no laudo: guarda, serve, não duplica no reenvio e sai com o laudo (LMO-05)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const legalCase = await admin.as(request(app).post('/expert-cases')).send(CASE);
    const { body: template } = await admin.as(request(app).get('/expert-reports/templates/standard-report'));
    const created = await admin.as(request(app).post('/expert-reports')).send({
      caseId: legalCase.body.data.id,
      templateId: 'standard-report',
      sections: [{ id: sectionByTitle(template.data.sections, 'Objetivo').id, variant: 'yes' }],
    });
    const id = created.body.data.id;
    const mediaId = crypto.randomUUID();
    const upload = () =>
      admin
        .as(request(app).put(`/expert-reports/${id}/media/${mediaId}`))
        .set('Content-Type', 'image/jpeg')
        .send(JPEG);

    const sent = await upload();
    expect(sent.status).toBe(200);
    expect(sent.body.data.src).toBe(`/expert-reports/${id}/media/${mediaId}`);
    await upload().expect(200);
    expect((await Report.findById(id).lean())?.media).toHaveLength(1);
    const read = await admin.as(request(app).get(sent.body.data.src)).buffer(true).parse(binary);
    expect(read.status).toBe(200);
    expect(Buffer.compare(read.body as Buffer, JPEG)).toBe(0);

    const png = await admin
      .as(request(app).put(`/expert-reports/${id}/media/${crypto.randomUUID()}`))
      .set('Content-Type', 'image/png')
      .send(JPEG);
    expect(png.status).toBe(415);

    const key = `tenants/${tenant._id}/reports/${id}/${mediaId}`;
    expect(objects.has(key)).toBe(true);
    await admin.as(request(app).delete(`/expert-reports/${id}`)).expect(200);
    expect(objects.has(key)).toBe(false);
  });

  it('parecer técnico para assistente técnico; tipo errado 422; excluir a perícia leva os laudos; outro tenant 404', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const legalCase = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, courtType: 'civil', role: 'technical_assistant', court: 'TJSP' });
    const caseId = legalCase.body.data.id;
    const { body: template } = await admin.as(request(app).get('/expert-reports/templates/standard-technical_opinion'));
    const objection = sectionByTitle(template.data.sections, 'Impugnação do laudo pericial');
    const identification = sectionByTitle(template.data.sections, 'Identificação do processo');

    const wrong = await admin
      .as(request(app).post('/expert-reports'))
      .send({ caseId, templateId: 'standard-report', sections: [{ id: 'report-01', variant: 'yes' }] });
    expect(wrong.status).toBe(422);
    expect(wrong.body.message).toBe('report_template_type_mismatch');

    const opinion = await admin.as(request(app).post('/expert-reports')).send({
      caseId,
      templateId: 'standard-technical_opinion',
      sections: [
        { id: identification.id, variant: 'yes' },
        { id: objection.id, variant: 'no' },
      ],
    });
    expect(opinion.status).toBe(201);
    expect(opinion.body.data.type).toBe('technical_opinion');
    expect(opinion.body.data.sections[0].html).toContain('Autor');
    expect(opinion.body.data.sections[1].html).toBe('<p>Não há impugnação ao laudo pericial.</p>');

    const other = await seedSession((await seedTenant())._id, ['admin']);
    expect((await other.as(request(app).get(`/expert-reports/${opinion.body.data.id}`))).status).toBe(404);

    await admin.as(request(app).delete(`/expert-cases/${caseId}`)).expect(200);
    await expect.poll(() => Report.countDocuments({ Case: caseId })).toBe(0);
  });
});
