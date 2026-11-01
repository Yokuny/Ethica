import { reportRoleType } from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import * as appointmentService from '../agenda/appointment.service.js';
import * as inspectionService from '../agenda/inspection.service.js';
import type { CaseRecord } from '../case/case.schema.js';
import * as caseService from '../case/case.service.js';
import * as deadlineService from '../case/deadline.service.js';
import * as accountService from '../identity/account.service.js';
import * as officeService from '../identity/office.service.js';
import type { DocumentContext, GeneratedFile } from './documents.schema.js';
import { reportDocx } from './report.docx.js';
import { issuesOf, type ReportValues, resolveVariables, sanitizeReportHtml } from './report.html.js';
import * as reportRepository from './report.repository.js';
import type {
  CompleteReport,
  CreateReport,
  ListReportsQuery,
  ReportListItem,
  ReportRecord,
  ReportSectionRecord,
  UpdateReportSection,
} from './report.schema.js';
import { reportHtml } from './report.templates.js';
import { reportValues } from './report.variables.js';
import * as templateService from './template.service.js';

export class ReportNotFoundError extends KeyedError {}

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

// Etapas anteriores à entrega: concluir com a entrega avança para `report_delivered` (AD-126)
// com a fase "aguardando manifestação das partes" (AD-133).
const BEFORE_DELIVERY = new Set(['appointed', 'accepted', 'inspection', 'drafting_report']);

const comNumero = async <T extends { caseId: string }>(tenantId: string, items: T[]): Promise<T[]> => {
  const summaries = await caseService.findSummariesByIds(tenantId, [...new Set(items.map((item) => item.caseId))]);
  return items.map((item) => {
    const numero = summaries.get(item.caseId)?.processNumber;
    return numero ? { ...item, caseNumber: numero } : item;
  });
};

const encontrado = (report: ReportRecord | null): ReportRecord => {
  if (!report) throw new ReportNotFoundError('not_found');
  return report;
};

const editavel = async (tenantId: string, id: string): Promise<ReportRecord> => {
  const report = encontrado(await reportRepository.findById(tenantId, id));
  if (report.status === 'completed') throw new CustomError('report_completed', 409);
  return report;
};

// Dados da perícia, de quem gera e do escritório no momento (AD-126).
const dadosAtuais = async (providers: Pick<Providers, 'storage'>, ctx: DocumentContext, legalCase: CaseRecord) => {
  const [identity, expert, appointments, field] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
    appointmentService.listByCase(ctx.tenantId, legalCase.id),
    inspectionService.lastDoneByCase(ctx.tenantId, legalCase.id),
  ]);
  const values = reportValues({
    legalCase,
    expert,
    identity,
    appointments,
    field: field && { dados: field.inspection.dados, inicio: field.appointment.inicio },
    today: dateInDisplayTz(ctx.now),
  });
  return { identity, expert, values };
};

const resolveSections = (sections: ReportSectionRecord[], values: ReportValues): ReportSectionRecord[] =>
  sections.map((section) => ({
    ...section,
    titulo: resolveVariables(section.titulo, values, 'texto'),
    html: resolveVariables(section.html, values, 'html'),
  }));

// Nenhum documento sai nem é concluído com marcador sem valor (AD-126).
const withoutIssues = (sections: ReportSectionRecord[]): void => {
  const pending = issuesOf(sections);
  if (pending.length) {
    throw new CustomError('report_unresolved_variables', 422, pending.map((issue) => issue.sectionId).join(','));
  }
};

export const listReports = async (
  tenantId: string,
  query: ListReportsQuery,
): Promise<{ items: ReportListItem[]; total: number }> => {
  const result = await reportRepository.list(tenantId, query);
  return { ...result, items: await comNumero(tenantId, result.items) };
};

const getReport = async (tenantId: string, id: string): Promise<ReportRecord> => {
  const [report] = await comNumero(tenantId, [encontrado(await reportRepository.findById(tenantId, id))]);
  return report as ReportRecord;
};

// Abrir o rascunho resolve de novo as variáveis com os dados atuais, sem gravar: a tela mostra
// o mesmo texto e as mesmas pendências que a exportação e a conclusão vão usar (AD-126). Salvar
// a seção grava o texto já resolvido; o concluído é devolvido como foi gravado.
export const openReport = async (ctx: DocumentContext, id: string): Promise<ReportRecord> => {
  const report = await getReport(ctx.tenantId, id);
  if (report.status === 'completed') return report;
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { values } = await dadosAtuais({}, ctx, legalCase);
  const sections = resolveSections(report.sections, values);
  return { ...report, sections, issues: issuesOf(sections) };
};

// LAU-02: copia as seções escolhidas, na ordem do modelo, com o texto da variante e as
// variáveis já resolvidas. O tipo vem do papel na perícia (LAU-06).
export const createReport = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  data: CreateReport,
): Promise<ReportRecord> => {
  const legalCase = await caseService.getCase(ctx.tenantId, data.caseId);
  const tipo = reportRoleType(legalCase.role);
  const template = await templateService.getTemplate(ctx.tenantId, data.templateId);
  if (template.tipo !== tipo) throw new CustomError('report_template_type_mismatch', 422);
  const variants = new Map(data.sections.map((escolha) => [escolha.id, escolha.variant]));
  const escolhidas = template.sections.filter((section) => variants.has(section.id));
  if (escolhidas.length !== variants.size) throw new CustomError('invalid_data', 422, 'seção fora do modelo');
  const { values } = await dadosAtuais(providers, ctx, legalCase);
  const report = await reportRepository.create({
    tenantId: ctx.tenantId,
    caseId: legalCase.id,
    userId: ctx.userId,
    tipo,
    titulo: tipo === 'technical_opinion' ? 'Parecer técnico' : 'Laudo pericial',
    templateName: template.nome,
    sections: escolhidas.map((section) => {
      const variant = variants.get(section.id) ?? 'yes';
      return {
        titulo: resolveVariables(section.titulo, values, 'texto'),
        level: section.level,
        titleOnly: section.titleOnly,
        pageBreak: section.pageBreak,
        variant,
        html: section.titleOnly
          ? ''
          : resolveVariables(variant === 'yes' ? section.yesText : section.noText, values, 'html'),
      };
    }),
  });
  return { ...report, caseNumber: legalCase.processNumber };
};

export const updateSection = async (
  ctx: DocumentContext,
  id: string,
  sectionId: string,
  data: UpdateReportSection,
): Promise<ReportRecord> => {
  const { tenantId } = ctx;
  await editavel(tenantId, id);
  const updated = await reportRepository.updateSection(tenantId, id, sectionId, {
    titulo: data.titulo,
    html: data.html === undefined ? undefined : sanitizeReportHtml(data.html),
  });
  return openReport(ctx, encontrado(updated).id);
};

// Remover renumera sozinho: o número vem da posição (AD-126). A última seção fica.
export const removeSection = async (ctx: DocumentContext, id: string, sectionId: string): Promise<ReportRecord> => {
  const { tenantId } = ctx;
  const report = await editavel(tenantId, id);
  if (!report.sections.some((section) => section.id === sectionId)) throw new ReportNotFoundError('not_found');
  if (report.sections.length === 1) throw new CustomError('report_needs_section', 422);
  encontrado(await reportRepository.removeSection(tenantId, id, sectionId));
  return openReport(ctx, id);
};

// LAU-03.4: resolve de novo com os dados atuais, grava o texto final e bloqueia a edição.
// Com a entrega: protocola o prazo, lança a movimentação e avança a etapa (AD-126).
export const completeReport = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  id: string,
  { recordDelivery }: CompleteReport,
): Promise<ReportRecord> => {
  const report = await editavel(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { values } = await dadosAtuais(providers, ctx, legalCase);
  const sections = resolveSections(report.sections, values);
  withoutIssues(sections);
  encontrado(await reportRepository.complete(ctx.tenantId, id, ctx.userId, ctx.now, sections));
  if (recordDelivery) {
    await deadlineService.fileReportDelivery(ctx.tenantId, legalCase.id, ctx.now);
    await caseService.addMovement(ctx.tenantId, legalCase.id, {
      tipo: 'report_filed',
      data: dateInDisplayTz(ctx.now),
      observacoes: `${report.titulo} concluído no Ethica.`,
    });
    if (BEFORE_DELIVERY.has(legalCase.status)) {
      await caseService.updateCase(ctx.tenantId, legalCase.id, {
        status: 'report_delivered',
        phase: 'awaiting_objections',
      });
    }
  }
  return getReport(ctx.tenantId, id);
};

export const deleteReport = async (tenantId: string, id: string): Promise<void> => {
  await editavel(tenantId, id);
  const { deletedCount } = await reportRepository.removeDraft(tenantId, id);
  if (deletedCount === 0) throw new ReportNotFoundError('not_found');
};

export const deleteByCase = (tenantId: string, caseId: string) => reportRepository.deleteByCase(tenantId, caseId);

// Exportar (LAU-03.2): mesmas variáveis resolvidas de novo, sem gravar; pendente → 422.
const toExport = async (providers: Providers, ctx: DocumentContext, id: string) => {
  const report = await getReport(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { identity, expert, values } = await dadosAtuais(providers, ctx, legalCase);
  const sections = resolveSections(report.sections, values);
  withoutIssues(sections);
  // Fotos da vistoria no texto (AD-129): bytes lidos aqui, só do próprio tenant.
  const srcs = [
    ...new Set(
      sections.flatMap((section) => [...section.html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1] as string)),
    ),
  ];
  const lidas = await Promise.all(
    srcs.map(
      async (src) => [src, await inspectionService.readReportPhoto(providers.storage, ctx.tenantId, src)] as const,
    ),
  );
  const photos = Object.fromEntries(lidas.flatMap(([src, photo]) => (photo ? [[src, photo]] : [])));
  return { report: { ...report, sections }, legalCase, identity, expert, values, photos, geradoEm: ctx.now };
};

const fileName = (report: ReportRecord, legalCase: CaseRecord, extensao: string): string =>
  `${report.tipo === 'technical_opinion' ? 'technical-opinion' : 'report'}-${legalCase.processNumber}.${extensao}`;

export const generatePdf = async (providers: Providers, ctx: DocumentContext, id: string): Promise<GeneratedFile> => {
  const dados = await toExport(providers, ctx, id);
  return {
    nome: fileName(dados.report, dados.legalCase, 'pdf'),
    tipo: 'application/pdf',
    conteudo: await providers.pdf.render(reportHtml(dados)),
  };
};

export const generateDocx = async (providers: Providers, ctx: DocumentContext, id: string): Promise<GeneratedFile> => {
  const dados = await toExport(providers, ctx, id);
  return {
    nome: fileName(dados.report, dados.legalCase, 'docx'),
    tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    conteudo: await reportDocx(dados),
  };
};
