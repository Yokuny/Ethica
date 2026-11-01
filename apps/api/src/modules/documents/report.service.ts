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
  ChooseReportSections,
  CompleteReport,
  CreateReport,
  ListReportsQuery,
  ReportListItem,
  ReportRecord,
  ReportSectionRecord,
  ReportSectionWrite,
  TemplateRecord,
  TemplateSectionRecord,
  UpdateReportSection,
} from './report.schema.js';
import { reportHtml } from './report.templates.js';
import { reportValues } from './report.variables.js';
import * as templateService from './template.service.js';

export class ReportNotFoundError extends KeyedError {}

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

// Statuses before delivery: completing with delivery moves to `report_delivered` (AD-126)
// with the "waiting for the parties' response" phase (AD-133).
const BEFORE_DELIVERY = new Set(['appointed', 'accepted', 'inspection', 'drafting_report']);

const withNumber = async <T extends { caseId: string }>(tenantId: string, items: T[]): Promise<T[]> => {
  const summaries = await caseService.findSummariesByIds(tenantId, [...new Set(items.map((item) => item.caseId))]);
  return items.map((item) => {
    const number = summaries.get(item.caseId)?.processNumber;
    return number ? { ...item, caseNumber: number } : item;
  });
};

const found = (report: ReportRecord | null): ReportRecord => {
  if (!report) throw new ReportNotFoundError('not_found');
  return report;
};

const editable = async (tenantId: string, id: string): Promise<ReportRecord> => {
  const report = found(await reportRepository.findById(tenantId, id));
  if (report.status === 'completed') throw new CustomError('report_completed', 409);
  return report;
};

// Data of the case, of whoever generates it and of the office at the moment (AD-126).
const currentData = async (providers: Pick<Providers, 'storage'>, ctx: DocumentContext, legalCase: CaseRecord) => {
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
    field: field && { data: field.inspection.data, start: field.appointment.start },
    today: dateInDisplayTz(ctx.now),
  });
  return { identity, expert, values };
};

const resolveSections = (sections: ReportSectionRecord[], values: ReportValues): ReportSectionRecord[] =>
  sections.map((section) => ({
    ...section,
    title: resolveVariables(section.title, values, 'text'),
    html: resolveVariables(section.html, values, 'html'),
  }));

// No document leaves or is completed with a marker without a value (AD-126).
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
  return { ...result, items: await withNumber(tenantId, result.items) };
};

const getReport = async (tenantId: string, id: string): Promise<ReportRecord> => {
  const [report] = await withNumber(tenantId, [found(await reportRepository.findById(tenantId, id))]);
  return report as ReportRecord;
};

// Opening the draft resolves the variables again with the current data, without saving: the screen shows
// the same text and the same issues that export and completion will use (AD-126). Saving
// the section saves the text already resolved; the completed one is returned as it was saved.
export const openReport = async (ctx: DocumentContext, id: string): Promise<ReportRecord> => {
  const report = await getReport(ctx.tenantId, id);
  if (report.status === 'completed') return report;
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { values } = await currentData({}, ctx, legalCase);
  const sections = resolveSections(report.sections, values);
  return { ...report, sections, issues: issuesOf(sections) };
};

// Chosen template sections, in template order, with the variant of each one (LAU-02, LMO-01).
const chosenSections = async (
  tenantId: string,
  type: string,
  { templateId, sections }: ChooseReportSections,
): Promise<{ template: TemplateRecord; chosen: Array<[TemplateSectionRecord, 'yes' | 'no']> }> => {
  const template = await templateService.getTemplate(tenantId, templateId);
  if (template.type !== type) throw new CustomError('report_template_type_mismatch', 422);
  const variants = new Map(sections.map((choice) => [choice.id, choice.variant]));
  const chosen = template.sections.flatMap((section): Array<[TemplateSectionRecord, 'yes' | 'no']> => {
    const variant = variants.get(section.id);
    return variant ? [[section, variant]] : [];
  });
  if (chosen.length !== variants.size) throw new CustomError('invalid_data', 422, 'seção fora do modelo');
  return { template, chosen };
};

// Template section copied into the report in the variant text, with the variables already resolved.
const fromTemplate = (section: TemplateSectionRecord, variant: 'yes' | 'no', values: ReportValues) =>
  ({
    templateSectionId: section.id,
    title: resolveVariables(section.title, values, 'text'),
    level: section.level,
    titleOnly: section.titleOnly,
    pageBreak: section.pageBreak,
    variant,
    html: section.titleOnly
      ? ''
      : resolveVariables(variant === 'yes' ? section.yesText : section.noText, values, 'html'),
  }) satisfies ReportSectionWrite;

// LAU-02: copies the chosen sections. The type comes from the role on the case (LAU-06).
export const createReport = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  data: CreateReport,
): Promise<ReportRecord> => {
  const legalCase = await caseService.getCase(ctx.tenantId, data.caseId);
  const type = reportRoleType(legalCase.role);
  const { template, chosen } = await chosenSections(ctx.tenantId, type, data);
  const { values } = await currentData(providers, ctx, legalCase);
  const report = await reportRepository.create({
    tenantId: ctx.tenantId,
    caseId: legalCase.id,
    userId: ctx.userId,
    type,
    title: type === 'technical_opinion' ? 'Parecer técnico' : 'Laudo pericial',
    templateId: template.id,
    templateName: template.name,
    sections: chosen.map(([section, variant]) => fromTemplate(section, variant, values)),
  });
  return { ...report, caseNumber: legalCase.processNumber };
};

// LMO-01: redoes the choice of sections in the draft. A section still chosen in the same variant keeps
// the edited text; a new one comes from the template; an unchecked one leaves. Another template starts over.
export const chooseSections = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  id: string,
  data: ChooseReportSections,
): Promise<ReportRecord> => {
  const report = await editable(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { template, chosen } = await chosenSections(ctx.tenantId, report.type, data);
  const { values } = await currentData(providers, ctx, legalCase);
  const current = new Map(
    report.templateId === template.id
      ? report.sections.flatMap((section) => (section.templateSectionId ? [[section.templateSectionId, section]] : []))
      : [],
  );
  const sections = chosen.map(([section, variant]) => {
    const kept = current.get(section.id);
    return kept?.variant === variant ? kept : fromTemplate(section, variant, values);
  });
  found(
    await reportRepository.replaceSections(ctx.tenantId, id, {
      templateId: template.id,
      templateName: template.name,
      sections,
    }),
  );
  return openReport(ctx, id);
};

export const updateSection = async (
  ctx: DocumentContext,
  id: string,
  sectionId: string,
  data: UpdateReportSection,
): Promise<ReportRecord> => {
  const { tenantId } = ctx;
  await editable(tenantId, id);
  const updated = await reportRepository.updateSection(tenantId, id, sectionId, {
    title: data.title,
    html: data.html === undefined ? undefined : sanitizeReportHtml(data.html),
  });
  return openReport(ctx, found(updated).id);
};

// Removing renumbers by itself: the number comes from the position (AD-126). The last section stays.
export const removeSection = async (ctx: DocumentContext, id: string, sectionId: string): Promise<ReportRecord> => {
  const { tenantId } = ctx;
  const report = await editable(tenantId, id);
  if (!report.sections.some((section) => section.id === sectionId)) throw new ReportNotFoundError('not_found');
  if (report.sections.length === 1) throw new CustomError('report_needs_section', 422);
  found(await reportRepository.removeSection(tenantId, id, sectionId));
  return openReport(ctx, id);
};

// LAU-03.4: resolves again with the current data, saves the final text and locks editing.
// With delivery: files the deadline, posts the movement and advances the status (AD-126).
export const completeReport = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  id: string,
  { recordDelivery }: CompleteReport,
): Promise<ReportRecord> => {
  const report = await editable(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { values } = await currentData(providers, ctx, legalCase);
  const sections = resolveSections(report.sections, values);
  withoutIssues(sections);
  found(await reportRepository.complete(ctx.tenantId, id, ctx.userId, ctx.now, sections));
  if (recordDelivery) {
    await deadlineService.fileReportDelivery(ctx.tenantId, legalCase.id, ctx.now);
    await caseService.addMovement(ctx.tenantId, legalCase.id, {
      type: 'report_filed',
      date: dateInDisplayTz(ctx.now),
      notes: `${report.title} concluído no Ethica.`,
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
  await editable(tenantId, id);
  const { deletedCount } = await reportRepository.removeDraft(tenantId, id);
  if (deletedCount === 0) throw new ReportNotFoundError('not_found');
};

export const deleteByCase = (tenantId: string, caseId: string) => reportRepository.deleteByCase(tenantId, caseId);

// Export (LAU-03.2): same variables resolved again, without saving; pending → 422.
const toExport = async (providers: Providers, ctx: DocumentContext, id: string) => {
  const report = await getReport(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { identity, expert, values } = await currentData(providers, ctx, legalCase);
  const sections = resolveSections(report.sections, values);
  withoutIssues(sections);
  // Inspection photos in the text (AD-129): bytes read here, only from the same tenant.
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
  return { report: { ...report, sections }, legalCase, identity, expert, values, photos, generatedAt: ctx.now };
};

const fileName = (report: ReportRecord, legalCase: CaseRecord, extension: string): string =>
  `${report.type === 'technical_opinion' ? 'technical-opinion' : 'report'}-${legalCase.processNumber}.${extension}`;

export const generatePdf = async (providers: Providers, ctx: DocumentContext, id: string): Promise<GeneratedFile> => {
  const data = await toExport(providers, ctx, id);
  return {
    name: fileName(data.report, data.legalCase, 'pdf'),
    type: 'application/pdf',
    conteudo: await providers.pdf.render(reportHtml(data)),
  };
};

export const generateDocx = async (providers: Providers, ctx: DocumentContext, id: string): Promise<GeneratedFile> => {
  const data = await toExport(providers, ctx, id);
  return {
    name: fileName(data.report, data.legalCase, 'docx'),
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    conteudo: await reportDocx(data),
  };
};
