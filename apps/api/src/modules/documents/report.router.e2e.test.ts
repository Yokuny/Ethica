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
import type { PdfDocument } from '../../providers/pdfRenderer.js';

const DEVICE = 'test-agent';
let rendered: PdfDocument | undefined;
const app = buildApp({
  pdf: {
    render: async (document) => {
      rendered = document;
      return Buffer.from('%PDF-1.7 fake');
    },
  },
  storage: null,
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
    registroProfissional: 'CREA-SP 555',
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

type Section = { id: string; titulo: string };
const sectionByTitle = (sections: Section[], titulo: string): Section => {
  const section = sections.find((item) => item.titulo === titulo);
  if (!section) throw new Error(`seção ${titulo} não existe`);
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
    const operador = await seedSession(tenant._id, ['operator']);
    const gestor = await seedSession(tenant._id, ['manager']);

    const lista = await operador.as(request(app).get('/expert-reports/templates?tipo=report'));
    expect(lista.status).toBe(200);
    expect(lista.body.data).toEqual([expect.objectContaining({ id: 'standard-report', padrao: true })]);
    const padrao = await operador.as(request(app).get('/expert-reports/templates/standard-report'));
    expect(padrao.body.data.sections.length).toBeGreaterThan(30);

    const negado = await operador
      .as(request(app).post('/expert-reports/templates'))
      .send({ nome: 'Meu', tipo: 'report' });
    expect(negado.status).toBe(403);
    const renomearPadrao = await gestor
      .as(request(app).patch('/expert-reports/templates/standard-report'))
      .send({ nome: 'X' });
    expect(renomearPadrao.status).toBe(403);
    expect(renomearPadrao.body.message).toBe('standard_template_read_only');

    const clone = await gestor
      .as(request(app).post('/expert-reports/templates'))
      .send({ nome: 'Insalubridade do escritório', tipo: 'report', baseId: 'standard-report' });
    expect(clone.status).toBe(201);
    expect(clone.body.data.sections).toHaveLength(padrao.body.data.sections.length);
    const wrongType = await gestor
      .as(request(app).post('/expert-reports/templates'))
      .send({ nome: 'Errado', tipo: 'technical_opinion', baseId: 'standard-report' });
    expect(wrongType.status).toBe(422);

    const templateId = clone.body.data.id;
    const nova = await gestor.as(request(app).post(`/expert-reports/templates/${templateId}/sections`)).send({
      titulo: 'Anexo fotográfico',
      level: 1,
      titleOnly: false,
      pageBreak: true,
      yesText: '<p onclick="x()">Fotos <script>alert(1)</script><a href="http://x">aqui</a></p>',
      noText: '<p>Sem fotos</p>',
    });
    expect(nova.status).toBe(201);
    const adicionada = nova.body.data.sections.at(-1);
    expect(adicionada.yesText).toBe('<p>Fotos aqui</p>');

    const movida = await gestor
      .as(request(app).post(`/expert-reports/templates/${templateId}/sections/${adicionada.id}/move`))
      .send({ direcao: 'up' });
    expect(movida.body.data.sections.at(-2).id).toBe(adicionada.id);
    const removida = await gestor.as(
      request(app).delete(`/expert-reports/templates/${templateId}/sections/${adicionada.id}`),
    );
    expect(removida.body.data.sections).toHaveLength(padrao.body.data.sections.length);

    const doEscritorio = await operador.as(request(app).get('/expert-reports/templates?tipo=report'));
    expect(doEscritorio.body.data).toHaveLength(2);
  });

  it('laudo: cria com variáveis resolvidas, bloqueia com pendência, conclui com a entrega e fica só leitura', async () => {
    const tenant = await seedTenant();
    const admin = await seedSession(tenant._id, ['admin']);
    const operador = await seedSession(tenant._id, ['operator']);
    const legalCase = await admin
      .as(request(app).post('/expert-cases'))
      .send({ ...CASE, reportDeadline: '2026-12-01' });
    const caseId = legalCase.body.data.id;
    const { body: template } = await operador.as(request(app).get('/expert-reports/templates/standard-report'));
    const identificacao = sectionByTitle(template.data.sections, 'Identificação do processo');
    const conclusao = sectionByTitle(template.data.sections, 'Conclusão');
    const encerramento = sectionByTitle(template.data.sections, 'Encerramento');

    const criado = await operador.as(request(app).post('/expert-reports')).send({
      caseId,
      templateId: 'standard-report',
      sections: [
        { id: encerramento.id, variant: 'no' },
        { id: identificacao.id, variant: 'yes' },
        { id: conclusao.id, variant: 'no' },
      ],
    });
    expect(criado.status).toBe(201);
    const report = criado.body.data;
    expect(report).toMatchObject({ tipo: 'report', status: 'draft', caseNumber: CASE.processNumber });
    // Ordem do modelo, não a da escolha.
    expect(report.sections.map((section: Section) => section.titulo)).toEqual([
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

    // Dado preenchido na perícia depois de criar o laudo resolve ao reabrir o rascunho.
    expect(report.sections[1].html).toContain('[PERIODO_IMPRESCRITO]');
    await admin
      .as(request(app).patch(`/expert-cases/${caseId}`))
      .send({ nonPrescribedPeriodStart: '2021-01-04', nonPrescribedPeriodEnd: '2024-05-31' })
      .expect(200);
    const reaberto = await operador.as(request(app).get(`/expert-reports/${report.id}`));
    expect(reaberto.body.data.sections[1].html).toContain('04/01/2021 a 31/05/2024');
    expect(reaberto.body.data.issues).toEqual([
      { sectionId: report.sections[0].id, variables: ['[NOME_AUTOR]', '[NOME_REU]'] },
      { sectionId: report.sections[1].id, variables: ['[NOME_AUTOR]'] },
    ]);

    const bloqueado = await operador
      .as(request(app).post(`/expert-reports/${report.id}/complete`))
      .send({ recordDelivery: true });
    expect(bloqueado.status).toBe(422);
    expect(bloqueado.body.message).toBe('report_unresolved_variables');
    const pdfBloqueado = await operador.as(request(app).get(`/expert-reports/${report.id}/pdf`));
    expect(pdfBloqueado.status).toBe(422);

    for (const section of report.sections.slice(0, 2)) {
      const editada = await operador
        .as(request(app).patch(`/expert-reports/${report.id}/sections/${section.id}`))
        .send({ html: '<p>Texto revisado pelo perito.</p>' });
      expect(editada.status).toBe(200);
    }
    const removida = await operador.as(
      request(app).delete(`/expert-reports/${report.id}/sections/${report.sections[1].id}`),
    );
    expect(removida.body.data.sections).toHaveLength(2);
    expect(removida.body.data.issues).toEqual([]);

    const pdf = await operador
      .as(request(app).get(`/expert-reports/${report.id}/pdf`))
      .buffer()
      .parse(binary);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-disposition']).toContain(`report-${CASE.processNumber}.pdf`);
    expect(rendered?.html).toContain('LAUDO PERICIAL');
    expect(rendered?.html).toContain('2. Encerramento');
    const docx = await operador
      .as(request(app).get(`/expert-reports/${report.id}/docx`))
      .buffer()
      .parse(binary);
    expect(docx.status).toBe(200);
    expect((docx.body as Buffer).subarray(0, 2).toString()).toBe('PK');

    const completed = await operador
      .as(request(app).post(`/expert-reports/${report.id}/complete`))
      .send({ recordDelivery: true });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('completed');
    const today = dateInDisplayTz(new Date());
    const deadline = await Deadline.findOne({ Case: caseId }).lean();
    expect(deadline).toMatchObject({ status: 'filed', filedDate: today });
    const depois = await operador.as(request(app).get(`/expert-cases/${caseId}`));
    expect(depois.body.data.status).toBe('report_delivered');
    expect(depois.body.data.movements).toEqual([expect.objectContaining({ tipo: 'report_filed', data: today })]);

    const editCompleted = await operador
      .as(request(app).patch(`/expert-reports/${report.id}/sections/${report.sections[0].id}`))
      .send({ html: '<p>x</p>' });
    expect(editCompleted.status).toBe(409);
    expect(editCompleted.body.message).toBe('report_completed');
    expect((await operador.as(request(app).delete(`/expert-reports/${report.id}`))).status).toBe(409);
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
    const identificacao = sectionByTitle(template.data.sections, 'Identificação do processo');

    const wrong = await admin
      .as(request(app).post('/expert-reports'))
      .send({ caseId, templateId: 'standard-report', sections: [{ id: 'report-01', variant: 'yes' }] });
    expect(wrong.status).toBe(422);
    expect(wrong.body.message).toBe('report_template_type_mismatch');

    const opinion = await admin.as(request(app).post('/expert-reports')).send({
      caseId,
      templateId: 'standard-technical_opinion',
      sections: [
        { id: identificacao.id, variant: 'yes' },
        { id: objection.id, variant: 'no' },
      ],
    });
    expect(opinion.status).toBe(201);
    expect(opinion.body.data.tipo).toBe('technical_opinion');
    expect(opinion.body.data.sections[0].html).toContain('Autor');
    expect(opinion.body.data.sections[1].html).toBe('<p>Não há impugnação ao laudo pericial.</p>');

    const outro = await seedSession((await seedTenant())._id, ['admin']);
    expect((await outro.as(request(app).get(`/expert-reports/${opinion.body.data.id}`))).status).toBe(404);

    await admin.as(request(app).delete(`/expert-cases/${caseId}`)).expect(200);
    await expect.poll(() => Report.countDocuments({ Case: caseId })).toBe(0);
  });
});
