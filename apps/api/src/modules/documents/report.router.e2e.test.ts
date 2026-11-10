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
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';
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
// Minimal PDF with one text line per item (Helvetica, WinAnsi), no library.
const pdfOf = (rows: string[]): Buffer => {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = ['BT', '/F1 11 Tf', '14 TL', '50 780 Td', ...rows.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

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

  it('lista ordena pelo clique na coluna: modelo, situação e alteração; outra coluna é 400 (AD-192)', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    for (const sort of ['templateName', 'status', 'updatedAt']) {
      const res = await operator.as(request(app).get(`/expert-reports?sort=${sort}&order=asc`));
      expect(res.status).toBe(200);
    }
    expect((await operator.as(request(app).get('/expert-reports?sort=caseNumber'))).status).toBe(400);
  });

  it('modelos: padrão para todos e só leitura; admin/manager clonam e editam seções saneadas; operador 403', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const manager = await seedSession(tenant._id, ['manager']);

    const list = await operator.as(request(app).get('/expert-reports/templates?type=report'));
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({ id: 'standard-labor-report', isDefault: true }),
      expect.objectContaining({ id: 'standard-report', isDefault: true }),
    ]);
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
      unnumbered: false,
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
    expect(ofOffice.body.data).toHaveLength(3);
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
    // The list brings the court, the division and who wrote last in the report.
    const listed = await admin.as(request(app).get(`/expert-reports?caseId=${caseId}`));
    expect(listed.body.data.items[0]).toMatchObject({
      court: CASE.court,
      division: CASE.division,
      updatedById: operator.user.id,
      updatedByName: operator.user.name,
    });
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
    expect(rendered?.html).toContain('2. ENCERRAMENTO');
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
    expect(depois.body.data.phase).toBe('report_delivered');
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

  it('laudo anexado: concluído com a entrega, devolve o PDF enviado, vira modelo e sai com o arquivo (ANL-01 a ANL-04)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const legalCase = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, reportDeadline: '2026-12-01' });
    const caseId = legalCase.body.data.id;
    const file = pdfOf([
      'Laudo feito fora do Ethica.',
      '1. OBJETIVO',
      'Apurar a insalubridade alegada.',
      '1.1 Metodologia',
      'Inspecao no local de trabalho.',
      '2. CONCLUSAO',
      'Nao ha insalubridade.',
    ]);
    const attach = (query: string, body: Buffer = file) =>
      admin
        .as(request(app).post(`/expert-reports/file?caseId=${caseId}${query}`))
        .set('Content-Type', 'application/pdf')
        .send(body);

    expect((await attach('&name=x.pdf', Buffer.from('not a pdf'))).status).toBe(415);
    const created = await attach('&name=Laudo%20final.pdf&recordDelivery=true');
    expect(created.status).toBe(201);
    const report = created.body.data;
    expect(report).toMatchObject({
      type: 'report',
      status: 'completed',
      templateName: 'Laudo final',
      sections: [],
      file: { name: 'Laudo final.pdf', bytes: file.length },
    });
    const deadline = await Deadline.findOne({ Case: caseId }).lean();
    expect(deadline).toMatchObject({ status: 'filed' });
    const after = await admin.as(request(app).get(`/expert-cases/${caseId}`));
    expect(after.body.data.phase).toBe('report_delivered');
    // In the technical assistance the delivery leads to "Parecer técnico entregue" (AD-186).
    const assistance = await admin.as(request(app).post('/expert-cases')).send({
      role: 'technical_assistant',
      subject: 'Assistência ao reclamante',
      contractor: { name: 'Maria' },
      reportDeadline: '2026-12-01',
    });
    const opinion = await admin
      .as(
        request(app).post(
          `/expert-reports/file?caseId=${assistance.body.data.id}&name=Parecer.pdf&recordDelivery=true`,
        ),
      )
      .set('Content-Type', 'application/pdf')
      .send(file);
    expect(opinion.status).toBe(201);
    const assisted = await admin.as(request(app).get(`/expert-cases/${assistance.body.data.id}`));
    expect(assisted.body.data.phase).toBe('technical_opinion_delivered');
    const listed = await admin.as(request(app).get(`/expert-reports?caseId=${caseId}`));
    expect(listed.body.data.items[0].file).toEqual({ name: 'Laudo final.pdf', bytes: file.length });

    const pdf = await admin
      .as(request(app).get(`/expert-reports/${report.id}/pdf`))
      .buffer()
      .parse(binary);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-disposition']).toContain('Laudo final.pdf');
    expect(Buffer.compare(pdf.body as Buffer, file)).toBe(0);
    expect((await admin.as(request(app).get(`/expert-reports/${report.id}/docx`))).status).toBe(404);

    const template = await admin
      .as(request(app).post(`/expert-reports/${report.id}/template`))
      .send({ name: 'Do PDF' });
    expect(template.status).toBe(201);
    expect(
      template.body.data.sections.map((section: { title: string; level: number }) => [section.title, section.level]),
    ).toEqual([
      ['Laudo final', 1],
      ['OBJETIVO', 1],
      ['Metodologia', 2],
      ['CONCLUSAO', 1],
    ]);
    expect(template.body.data.sections[1].yesText).toBe('<p>Apurar a insalubridade alegada.</p>');

    const key = [...objects.keys()].find((item) => item.startsWith(`tenants/${tenant._id}/reports/files/`));
    expect(key).toBeDefined();
    await admin.as(request(app).delete(`/expert-reports/${report.id}`)).expect(200);
    expect(objects.has(key as string)).toBe(false);
  });

  it('PDF do layout do modelo: dados do serviço como marcadores; modelo de outro escritório 404 (BIB-07)', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const pdf = await operator.as(request(app).get('/expert-reports/templates/standard-technical_opinion/pdf'));
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(rendered?.html).toContain('PARECER TÉCNICO');
    expect(rendered?.html).toContain('[NUMERO_PROCESSO]');
    expect(rendered?.html).toContain('DADOS PRELIMINARES');

    const other = await seedSession((await seedTenant())._id, ['admin']);
    const own = await Template.create({ Tenant: tenant._id, name: 'Meu', type: 'report', sections: [] });
    expect((await other.as(request(app).get(`/expert-reports/templates/${own._id}/pdf`))).status).toBe(404);
    expect(
      (await operator.as(request(app).get('/expert-reports/templates/standard-technical-objection/pdf'))).status,
    ).toBe(400);
  });

  it('biblioteca do escritório: importa Word com área, muda a área e o operador não importa (BIB-03, BIB-04)', async () => {
    const tenant = await seedTenant();
    const manager = await seedSession(tenant._id, ['manager']);
    const operator = await seedSession(tenant._id, ['operator']);
    const docx = await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: 'Objetivo', heading: HeadingLevel.HEADING_1 }),
              new Paragraph('Avaliar o imóvel.'),
            ],
          },
        ],
      }),
    );
    const docxType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const url = '/expert-reports/templates/file?name=Avalia%C3%A7%C3%A3o&type=report&area=Servi%C3%A7o%20particular';

    const denied = await operator.as(request(app).post(url)).set('Content-Type', docxType).send(docx);
    expect(denied.status).toBe(403);

    const imported = await manager.as(request(app).post(url)).set('Content-Type', docxType).send(docx);
    expect(imported.status).toBe(201);
    expect(imported.body.data).toMatchObject({ name: 'Avaliação', area: 'Serviço particular', isDefault: false });
    expect(imported.body.data.sections).toEqual([
      expect.objectContaining({ title: 'Objetivo', yesText: '<p>Avaliar o imóvel.</p>' }),
    ]);
    expect(imported.body.data.layout.font).toBe('source_sans');

    const moved = await manager
      .as(request(app).patch(`/expert-reports/templates/${imported.body.data.id}`))
      .send({ name: 'Avaliação', area: 'civil' });
    expect(moved.body.data.area).toBe('civil');
    const list = await operator.as(request(app).get('/expert-reports/templates?type=report'));
    expect(list.body.data).toContainEqual(expect.objectContaining({ id: imported.body.data.id, area: 'civil' }));

    const wrong = await manager.as(request(app).post(url)).set('Content-Type', 'text/plain').send('oi');
    expect(wrong.status).toBe(415);
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

    // Any template may be chosen from the case; the document type is the template's (PSV-04).
    const anyTemplate = await admin
      .as(request(app).post('/expert-reports'))
      .send({ caseId, templateId: 'standard-report', sections: [{ id: 'laudo-01', variant: 'yes' }] });
    expect(anyTemplate.status).toBe(201);
    expect(anyTemplate.body.data.type).toBe('report');

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
    expect(opinion.body.data.sections[0].html).toContain('Requerente');
    expect(opinion.body.data.sections[1].html).toBe('<p>Não há impugnação ao laudo pericial.</p>');

    const other = await seedSession((await seedTenant())._id, ['admin']);
    expect((await other.as(request(app).get(`/expert-reports/${opinion.body.data.id}`))).status).toBe(404);

    await admin.as(request(app).delete(`/expert-cases/${caseId}`)).expect(200);
    await expect.poll(() => Report.countDocuments({ Case: caseId })).toBe(0);
  });
  it('novo laudo: OS da sequência, responsável técnico, item novo, fora do laudo e layout (NLA-01 a NLA-06)', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operator = await seedSession(tenant._id, ['operator']);

    const sequence = await admin
      .as(request(app).put('/expert-cases/service-order'))
      .send({ pattern: '[SIGLA]-[ANO]-[NUMERO]', prefix: 'eth', digits: 3, year: new Date().getFullYear(), last: 8 });
    expect(sequence.status).toBe(200);
    expect(sequence.body.data.prefix).toBe('ETH');
    expect((await operator.as(request(app).put('/expert-cases/service-order')).send(sequence.body.data)).status).toBe(
      403,
    );
    const legalCase = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, processNumber: '0008888-11.2026.5.15.0001' });
    expect(legalCase.body.data.serviceOrder).toBe(`ETH-${new Date().getFullYear()}-009`);
    const repeated = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, processNumber: '0008889-11.2026.5.15.0001', serviceOrder: legalCase.body.data.serviceOrder });
    expect(repeated.status).toBe(409);
    expect(repeated.body.message).toBe('service_order_taken');
    // Custom pattern (AD-172): the sequence goes on from the last number used.
    const custom = await admin
      .as(request(app).put('/expert-cases/service-order'))
      .send({ ...sequence.body.data, pattern: 'OS [NUMERO]/[ANO]', prefix: '', digits: 4, last: 9 });
    expect(custom.status).toBe(200);
    const customCase = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, processNumber: '0008890-11.2026.5.15.0001' });
    expect(customCase.body.data.serviceOrder).toBe(`OS 0010/${new Date().getFullYear()}`);

    // Whoever drafts reports registers the technical responsible (NLA-02).
    const created = await operator.as(request(app).post('/expert-reports/signatories')).send({
      name: 'Eng. Carla Souza',
      cpf: '123.456.789-09',
      professionalRegistration: 'CREA/SC 999',
      education: 'Engenheira de Segurança do Trabalho',
      phone: '',
      header: 'Carla Souza · [NOME_PERITO]',
      footer: '',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ cpf: '12345678909', phone: '' });

    const { body: template } = await admin.as(request(app).get('/expert-reports/templates/standard-labor-report'));
    expect(template.data.layout.opening).toBe(true);
    const object = sectionByTitle(template.data.sections, 'Objeto da perícia');
    const role = sectionByTitle(template.data.sections, 'Função');
    const report = await admin.as(request(app).post('/expert-reports')).send({
      caseId: legalCase.body.data.id,
      signatoryId: created.body.data.id,
      templateId: 'standard-labor-report',
      sections: [
        { id: object.id, variant: 'yes' },
        { id: role.id, variant: 'yes' },
      ],
    });
    expect(report.status).toBe(201);
    const id = report.body.data.id;
    expect(report.body.data).toMatchObject({ signatoryId: created.body.data.id, layout: { opening: true } });
    expect(report.body.data.sections[0]).toMatchObject({ unnumbered: true, included: true });

    const added = await admin
      .as(request(app).post(`/expert-reports/${id}/sections`))
      .send({ title: 'Item da perita', level: 1, afterId: report.body.data.sections[0].id });
    expect(added.status).toBe(201);
    // A new item goes after the subitems of the one chosen, never taking them as its own.
    expect(added.body.data.sections.map((section: Section) => section.title)).toEqual([
      'Objeto da perícia',
      'Função',
      'Item da perita',
    ]);
    // Choosing the template sections again keeps the added item, after the template item above that stayed.
    const chosen = await admin
      .as(request(app).put(`/expert-reports/${id}/sections`))
      .send({ templateId: 'standard-labor-report', sections: [{ id: object.id, variant: 'yes' }] });
    expect(chosen.body.data.sections.map((section: Section) => section.title)).toEqual([
      'Objeto da perícia',
      'Item da perita',
    ]);

    // Out of the report: no longer blocks nor leaves in the PDF.
    const item = chosen.body.data.sections[1];
    await admin
      .as(request(app).patch(`/expert-reports/${id}/sections/${item.id}`))
      .send({ html: '<p>[NOME_AUTOR]</p>', included: false })
      .expect(200);
    const layout = { ...template.data.layout, font: 'arial', cover: false };
    const withLayout = await admin.as(request(app).put(`/expert-reports/${id}/layout`)).send(layout);
    expect(withLayout.body.data.layout.font).toBe('arial');
    expect(withLayout.body.data.issues).toEqual([]);
    const pdf = await admin.as(request(app).get(`/expert-reports/${id}/pdf`));
    expect(pdf.status).toBe(200);
    expect(rendered?.html).not.toContain('Item da perita');
    expect(rendered?.html).toContain('ENG. CARLA SOUZA');
    expect(rendered?.html).toContain('É o laudo.');
    expect(rendered?.html).not.toContain('class="capa"');
    expect(rendered?.headerTemplate).toContain('Carla Souza · Eng. Carla Souza');

    // Unchecking a topic takes its subitems along; checking it again brings them back.
    const topic = chosen.body.data.sections[0];
    const sub = await admin
      .as(request(app).post(`/expert-reports/${id}/sections`))
      .send({ title: 'Subitem', level: 2, afterId: topic.id });
    const subId = sub.body.data.sections[1].id;
    const off = await admin
      .as(request(app).patch(`/expert-reports/${id}/sections/${topic.id}`))
      .send({ included: false });
    expect(off.body.data.sections.map((section: Section & { included: boolean }) => section.included)).toEqual([
      false,
      false,
      false,
    ]);
    await admin.as(request(app).patch(`/expert-reports/${id}/sections/${topic.id}`)).send({ included: true });
    await admin
      .as(request(app).patch(`/expert-reports/${id}/sections/${subId}`))
      .send({ html: '<p>Processo 0008888-11.2026.5.15.0001</p>' })
      .expect(200);

    // AD-170: the items that are part of the report become a template, with the case data back to markers.
    expect(
      (await operator.as(request(app).post(`/expert-reports/${id}/template`)).send({ name: 'Meu modelo' })).status,
    ).toBe(403);
    const saved = await admin
      .as(request(app).post(`/expert-reports/${id}/template`))
      .send({ name: 'Meu modelo', details: 'Limpeza de banheiros' });
    expect(saved.status).toBe(201);
    expect(saved.body.data).toMatchObject({
      name: 'Meu modelo',
      details: 'Limpeza de banheiros',
      type: 'report',
      isDefault: false,
    });
    // Details (AD-181): in the list, editable and removed when empty.
    const listed = await admin.as(request(app).get('/expert-reports/templates'));
    expect(listed.body.data).toContainEqual(expect.objectContaining({ details: 'Limpeza de banheiros' }));
    const cleared = await admin
      .as(request(app).patch(`/expert-reports/templates/${saved.body.data.id}`))
      .send({ name: 'Meu modelo', details: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.details).toBeUndefined();
    expect(saved.body.data.sections.map((section: Section) => section.title)).toEqual(['Objeto da perícia', 'Subitem']);
    expect(saved.body.data.sections[1].yesText).toBe('<p>Processo [NUMERO_PROCESSO]</p>');

    // Arrows (AD-171): the item moves with its subitems and never leaves its topic; a new item goes after the subitems.
    const titles = (body: { data: { sections: Section[] } }) => body.data.sections.map((section) => section.title);
    const lastId = off.body.data.sections[2].id;
    const up = await admin
      .as(request(app).post(`/expert-reports/${id}/sections/${lastId}/move`))
      .send({ direction: 'up' });
    expect(titles(up.body)).toEqual(['Item da perita', 'Objeto da perícia', 'Subitem']);
    const stuck = await admin
      .as(request(app).post(`/expert-reports/${id}/sections/${subId}/move`))
      .send({ direction: 'up' });
    expect(titles(stuck.body)).toEqual(['Item da perita', 'Objeto da perícia', 'Subitem']);
    const after = await admin
      .as(request(app).post(`/expert-reports/${id}/sections`))
      .send({ title: 'Novo', level: 1, afterId: topic.id });
    expect(titles(after.body)).toEqual(['Item da perita', 'Objeto da perícia', 'Subitem', 'Novo']);
  });
});
