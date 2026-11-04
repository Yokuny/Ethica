import { randomUUID } from 'node:crypto';
import {
  CASE_PHASE_GROUPS,
  type CasePhase,
  caseLabel,
  REPORT_LAYOUT_DEFAULT,
  REPORT_MEDIA_LIMIT,
  REPORT_VARIABLES,
  type ReportLayout,
  reportRoleType,
  sectionFamily,
} from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import * as appointmentService from '../agenda/appointment.service.js';
import * as inspectionService from '../agenda/inspection.service.js';
import type { CaseRecord } from '../case/case.schema.js';
import * as caseService from '../case/case.service.js';
import * as deadlineService from '../case/deadline.service.js';
import * as importService from '../case/import.service.js';
import * as accountService from '../identity/account.service.js';
import * as authService from '../identity/auth.service.js';
import * as officeService from '../identity/office.service.js';
import { esc } from './document.layout.js';
import type { DocumentContext, GeneratedFile } from './documents.schema.js';
import { templateSectionsFromText } from './report.attachment.js';
import { reportDocx } from './report.docx.js';
import { issuesOf, type ReportValues, resolveVariables, sanitizeReportHtml } from './report.html.js';
import { applyProcess, extractProcess } from './report.process.js';
import * as reportRepository from './report.repository.js';
import type {
  AddReportSection,
  AttachReportQuery,
  ChooseReportSections,
  CompleteReport,
  CreateReport,
  ListReportsQuery,
  MoveSection,
  ProcessFill,
  ProcessMissing,
  ReportListItem,
  ReportRecord,
  ReportSectionRecord,
  ReportSectionWrite,
  TemplateRecord,
  TemplateSection,
  TemplateSectionRecord,
  UpdateReportSection,
  UpdateTemplate,
} from './report.schema.js';
import { reportHtml } from './report.templates.js';
import { reportValues } from './report.variables.js';
import * as signatoryService from './signatory.service.js';
import * as templateService from './template.service.js';

export class ReportNotFoundError extends KeyedError {}

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

// Phases before delivery: completing with delivery moves to `report_delivered` (AD-126, AD-178, AD-180).
const BEFORE_DELIVERY = new Set<CasePhase>([...CASE_PHASE_GROUPS.initial, ...CASE_PHASE_GROUPS.intermediate]);

const titleOf = (type: string): string => (type === 'technical_opinion' ? 'Parecer técnico' : 'Laudo pericial');

const withNumber = async <T extends { caseId: string }>(tenantId: string, items: T[]): Promise<T[]> => {
  const summaries = await caseService.findSummariesByIds(tenantId, [...new Set(items.map((item) => item.caseId))]);
  return items.map((item) => {
    const summary = summaries.get(item.caseId);
    if (!summary) return item;
    const { court, division, plaintiff, defendant } = summary;
    return { ...item, caseNumber: caseLabel(summary), court, division, plaintiff, defendant };
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

// Data of the case, of who signs and of the office at the moment (AD-126). Who signs is the technical
// responsible of the report (NLA-02) or, without one, whoever generates it.
const currentData = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  legalCase: CaseRecord,
  signatoryId?: string,
) => {
  const [office, profile, appointments, field] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
    appointmentService.listByCase(ctx.tenantId, legalCase.id),
    inspectionService.lastDoneByCase(ctx.tenantId, legalCase.id),
  ]);
  const signer = signatoryId
    ? await signatoryService.documentSigner(providers.storage, ctx.tenantId, signatoryId, office)
    : null;
  const identity = signer?.identity ?? office;
  const expert = signer?.expert ?? profile;
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
  const items = await withNumber(tenantId, result.items);
  const ids = [...new Set(items.flatMap((item) => (item.updatedById ? [item.updatedById] : [])))];
  const names = new Map((await authService.findUserNamesByIds(tenantId, ids)).map((user) => [user.id, user.name]));
  return {
    ...result,
    items: items.map((item) => {
      const updatedByName = item.updatedById && names.get(item.updatedById);
      return updatedByName ? { ...item, updatedByName } : item;
    }),
  };
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
  const { values } = await currentData({}, ctx, legalCase, report.signatoryId);
  const sections = resolveSections(report.sections, values);
  return { ...report, sections, issues: issuesOf(sections) };
};

// Chosen template sections, in template order, with the variant of each one (LAU-02, LMO-01).
// `type`: a draft keeps the type it was created with; a new report takes the template's (PSV-04).
const chosenSections = async (
  tenantId: string,
  type: string | undefined,
  { templateId, sections }: ChooseReportSections,
): Promise<{ template: TemplateRecord; chosen: Array<[TemplateSectionRecord, 'yes' | 'no']> }> => {
  const template = await templateService.getTemplate(tenantId, templateId);
  if (type && template.type !== type) throw new CustomError('report_template_type_mismatch', 422);
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
    unnumbered: section.unnumbered,
    included: true,
    variant,
    html: section.titleOnly
      ? ''
      : resolveVariables(variant === 'yes' ? section.yesText : section.noText, values, 'html'),
  }) satisfies ReportSectionWrite;

// LAU-02: copies the chosen sections. Any template of the office may be chosen; the type (report or
// opinion) is the template's (PSV-04, before it came from the role on the case, LAU-06).
export const createReport = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  data: CreateReport,
): Promise<ReportRecord> => {
  const legalCase = await caseService.getCase(ctx.tenantId, data.caseId);
  const { template, chosen } = await chosenSections(ctx.tenantId, undefined, data);
  const type = template.type;
  if (data.signatoryId) await signatoryService.getSignatory(ctx.tenantId, data.signatoryId);
  const { values } = await currentData(providers, ctx, legalCase, data.signatoryId);
  const report = await reportRepository.create({
    tenantId: ctx.tenantId,
    caseId: legalCase.id,
    userId: ctx.userId,
    signatoryId: data.signatoryId,
    layout: template.layout,
    type,
    title: titleOf(type),
    templateId: template.id,
    templateName: template.name,
    sections: chosen.map(([section, variant]) => fromTemplate(section, variant, values)),
  });
  return { ...report, caseNumber: caseLabel(legalCase) };
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
  const { values } = await currentData(providers, ctx, legalCase, report.signatoryId);
  const sameTemplate = report.templateId === template.id;
  const current = new Map(
    sameTemplate
      ? report.sections.flatMap((section) => (section.templateSectionId ? [[section.templateSectionId, section]] : []))
      : [],
  );
  const fromChoice = chosen.map(([section, variant]) => {
    const kept = current.get(section.id);
    return kept?.variant === variant ? kept : fromTemplate(section, variant, values);
  });
  // Items added in the report (NLA-05) stay after the template item they followed, in the same template; if
  // that one left, after the last one above it that stayed.
  const kept = new Set(chosen.map(([section]) => section.id));
  const added = new Map<string | undefined, ReportSectionRecord[]>();
  let anchor: string | undefined;
  for (const section of sameTemplate ? report.sections : []) {
    if (section.templateSectionId) {
      if (kept.has(section.templateSectionId)) anchor = section.templateSectionId;
    } else added.set(anchor, [...(added.get(anchor) ?? []), section]);
  }
  const sections = [
    ...(added.get(undefined) ?? []),
    ...fromChoice.flatMap((section) => [section, ...(added.get(section.templateSectionId) ?? [])]),
  ];
  found(
    await reportRepository.replaceSections(ctx, id, {
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
  { included, ...data }: UpdateReportSection,
): Promise<ReportRecord> => {
  const { tenantId } = ctx;
  const report = await editable(tenantId, id);
  const index = report.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) throw new ReportNotFoundError('not_found');
  if (included !== undefined) {
    const { parents, children } = sectionFamily(report.sections, index);
    const ids = [sectionId, ...children, ...(included ? parents : [])];
    found(await reportRepository.setIncluded(ctx, id, ids, included));
  }
  if (data.title !== undefined || data.html !== undefined) {
    found(
      await reportRepository.updateSection(ctx, id, sectionId, {
        title: data.title,
        html: data.html === undefined ? undefined : sanitizeReportHtml(data.html),
      }),
    );
  }
  return openReport(ctx, id);
};

// Text resolved with the case data goes back to the markers, so the template stays generic for the
// next case (AD-170). Short values ("Réu", "nenhum") are words of any text and stay as they are.
const MARKER_MIN = 8;
const toMarkers = (text: string, values: ReportValues, format: 'html' | 'text'): string =>
  REPORT_VARIABLES.flatMap((variable) => {
    const amount = values[variable]?.trim();
    return amount && amount.length >= MARKER_MIN ? [[variable, format === 'html' ? esc(amount) : amount] as const] : [];
  })
    .sort(([, a], [, b]) => b.length - a.length)
    .reduce((result, [variable, amount]) => result.replaceAll(amount, variable), text);

// AD-170: saves the items that are part of the report, with the written text, as an office template. The text
// goes in the variant the item uses; the other variant comes from the original template, when it still exists.
export const saveAsTemplate = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  id: string,
  { name, details }: UpdateTemplate,
) => {
  const report = await getReport(ctx.tenantId, id);
  if (report.file) return attachedAsTemplate(providers, ctx, report, { name, details });
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { values } = await currentData({}, ctx, legalCase, report.signatoryId);
  const original = report.templateId
    ? await templateService.getTemplate(ctx.tenantId, report.templateId).catch(() => undefined)
    : undefined;
  const sections = report.sections
    .filter((section) => section.included)
    .map((section): TemplateSection => {
      const base = original?.sections.find((item) => item.id === section.templateSectionId);
      const html = toMarkers(section.html, values, 'html');
      return {
        title: toMarkers(section.title, values, 'text'),
        level: section.level,
        titleOnly: section.titleOnly,
        pageBreak: section.pageBreak,
        unnumbered: section.unnumbered,
        yesText: section.variant === 'yes' ? html : (base?.yesText ?? ''),
        noText: section.variant === 'no' ? html : (base?.noText ?? ''),
      };
    });
  return templateService.createFromReport(ctx.tenantId, {
    name,
    details,
    type: report.type,
    sections,
    layout: report.layout,
  });
};

// ANL-04: the text of the attached PDF becomes an office template, a numbered heading per item.
const attachedAsTemplate = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  report: ReportRecord,
  { name, details }: UpdateTemplate,
) => {
  const file = await reportRepository.fileOf(ctx.tenantId, report.id);
  const body = file && providers.storage ? await providers.storage.get(file.key) : null;
  if (!body) throw new ReportNotFoundError('not_found');
  const sections = templateSectionsFromText(await importService.extractPdfText(body), report.templateName);
  return templateService.createFromReport(ctx.tenantId, {
    name,
    details,
    type: report.type,
    sections,
    layout: report.layout,
  });
};

// NLA-05: blank item after `afterId` and its subitems (or at the start), out of the template. Right after the
// item it would take the subitems of `afterId` as its own.
export const addSection = async (ctx: DocumentContext, id: string, data: AddReportSection): Promise<ReportRecord> => {
  const report = await editable(ctx.tenantId, id);
  const index = data.afterId ? report.sections.findIndex((section) => section.id === data.afterId) : -1;
  if (data.afterId && index < 0) throw new ReportNotFoundError('not_found');
  const position = data.afterId ? index + 1 + sectionFamily(report.sections, index).children.length : 0;
  found(
    await reportRepository.insertSection(ctx, id, position, {
      title: data.title,
      level: data.level,
      titleOnly: false,
      pageBreak: false,
      unnumbered: false,
      included: true,
      variant: 'yes',
      html: '',
    }),
  );
  return openReport(ctx, id);
};

// Arrows on the screen (AD-171): the item goes with its subitems and swaps with the neighbor of the same level,
// never leaving the topic it is in. At the edge nothing changes.
export const moveSection = async (
  ctx: DocumentContext,
  id: string,
  sectionId: string,
  { direction }: MoveSection,
): Promise<ReportRecord> => {
  const report = await editable(ctx.tenantId, id);
  const { sections } = report;
  const index = sections.findIndex((section) => section.id === sectionId);
  if (index < 0) throw new ReportNotFoundError('not_found');
  const level = (sections[index] as ReportSectionRecord).level;
  const end = index + 1 + sectionFamily(sections, index).children.length;
  let neighbor = -1;
  if (direction === 'up') {
    for (let i = index - 1; i >= 0 && neighbor < 0; i--) {
      if ((sections[i] as ReportSectionRecord).level <= level) neighbor = i;
    }
  } else if (end < sections.length) {
    neighbor = end;
  }
  if (neighbor < 0 || (sections[neighbor] as ReportSectionRecord).level < level) return openReport(ctx, id);
  const [first, second] = direction === 'up' ? [neighbor, index] : [index, neighbor];
  const secondEnd = second + 1 + sectionFamily(sections, second).children.length;
  const reordered = [
    ...sections.slice(0, first),
    ...sections.slice(second, secondEnd),
    ...sections.slice(first, second),
    ...sections.slice(secondEnd),
  ];
  found(await reportRepository.setSections(ctx, id, reordered));
  return openReport(ctx, id);
};

export const setLayout = async (ctx: DocumentContext, id: string, layout: ReportLayout): Promise<ReportRecord> => {
  await editable(ctx.tenantId, id);
  found(await reportRepository.setLayout(ctx, id, layout));
  return openReport(ctx, id);
};

// LMO-03 (AD-152): reads the full process PDF and fills the draft with the questions and the claims; the
// labor data found go back for the expert to confirm on the case. Nothing already written is deleted.
export const fillFromProcess = async (ctx: DocumentContext, id: string, file: Buffer): Promise<ProcessFill> => {
  const report = await editable(ctx.tenantId, id);
  const extraction = extractProcess(await importService.extractPdfText(file));
  const changed = applyProcess(report.sections, extraction);
  for (const section of changed) {
    await reportRepository.updateSection(ctx, id, section.id, { html: sanitizeReportHtml(section.html) });
  }
  const { questions, labor, claims } = extraction;
  const missing = (
    [
      [!questions.plaintiff.length, 'plaintiff_questions'],
      [!questions.defendant.length, 'defendant_questions'],
      [!questions.court.length, 'court_questions'],
      [!labor.hireDate, 'hiring_date'],
      [!labor.terminationDate, 'termination_date'],
      [!labor.claimantJob, 'claimant_job'],
      [!claims.length, 'initial_claims'],
      [
        Object.values(questions).some((list) => list.length) &&
          !changed.some((section) => /^\s*quesitos\b/i.test(section.title)),
        'questions_section',
      ],
    ] as const
  ).flatMap(([absent, key]): ProcessMissing[] => (absent ? [key] : []));
  return { report: await openReport(ctx, id), labor, missing };
};

// Removing renumbers by itself: the number comes from the position (AD-126). The last section stays.
export const removeSection = async (ctx: DocumentContext, id: string, sectionId: string): Promise<ReportRecord> => {
  const { tenantId } = ctx;
  const report = await editable(tenantId, id);
  if (!report.sections.some((section) => section.id === sectionId)) throw new ReportNotFoundError('not_found');
  if (report.sections.length === 1) throw new CustomError('report_needs_section', 422);
  found(await reportRepository.removeSection(ctx, id, sectionId));
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
  const { values } = await currentData(providers, ctx, legalCase, report.signatoryId);
  const sections = resolveSections(report.sections, values);
  withoutIssues(sections);
  found(await reportRepository.complete(ctx, id, ctx.now, sections));
  if (recordDelivery) await fileDelivery(ctx, legalCase, `${report.title} concluído no Ethica.`);
  return getReport(ctx.tenantId, id);
};

// ANL-02/03: PDF made outside the Ethica, born completed, with the quota reserved first (AD-120). The type
// follows the role on the case, like the title of the case panel (LAU-06).
export const attachReport = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentContext,
  { caseId, name, recordDelivery }: AttachReportQuery,
  body: Buffer,
): Promise<ReportRecord> => {
  if (!providers.storage) throw new CustomError('storage_not_configured', 503);
  if (Buffer.from(body.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new CustomError('unsupported_file_type', 415);
  }
  const legalCase = await caseService.getCase(ctx.tenantId, caseId);
  const type = reportRoleType(legalCase.role);
  const file = { key: `tenants/${ctx.tenantId}/reports/files/${randomUUID()}.pdf`, name, bytes: body.length };
  await officeService.reserveFile(ctx.tenantId, file.bytes);
  let report: ReportRecord;
  try {
    await providers.storage.put(file.key, body, 'application/pdf');
    report = await reportRepository.create({
      tenantId: ctx.tenantId,
      caseId: legalCase.id,
      userId: ctx.userId,
      type,
      title: titleOf(type),
      templateName: name.replace(/\.pdf$/i, ''),
      sections: [],
      layout: REPORT_LAYOUT_DEFAULT,
      file,
      completedAt: ctx.now,
    });
  } catch (error) {
    await providers.storage.remove(file.key).catch(() => undefined);
    await officeService.returnFile(ctx.tenantId, file.bytes);
    throw error;
  }
  if (recordDelivery) await fileDelivery(ctx, legalCase, `${report.title} anexado no Ethica.`);
  return { ...report, caseNumber: caseLabel(legalCase) };
};

// "Registrar a entrega" (AD-126): files the deadline, posts the movement and advances the phase.
const fileDelivery = async (ctx: DocumentContext, legalCase: CaseRecord, notes: string): Promise<void> => {
  await deadlineService.fileReportDelivery(ctx.tenantId, legalCase.id, ctx.now);
  await caseService.addMovement(ctx.tenantId, legalCase.id, {
    type: 'report_filed',
    date: dateInDisplayTz(ctx.now),
    notes,
  });
  if (BEFORE_DELIVERY.has(legalCase.phase)) {
    await caseService.updateCase(ctx.tenantId, legalCase.id, { phase: 'report_delivered' });
  }
};

// A draft or an attached PDF (ANL-02) is removed; the photos and the PDF leave with it and give the quota
// back (AD-120). A report completed in the Ethica stays.
export const deleteReport = async (
  providers: Pick<Providers, 'storage'>,
  tenantId: string,
  id: string,
): Promise<void> => {
  const report = found(await reportRepository.findById(tenantId, id));
  if (report.status === 'completed' && !report.file) throw new CustomError('report_completed', 409);
  const [media, file] = await Promise.all([
    reportRepository.listMedia(tenantId, id),
    reportRepository.fileOf(tenantId, id),
  ]);
  const { deletedCount } = await reportRepository.remove(tenantId, id);
  if (deletedCount === 0) throw new ReportNotFoundError('not_found');
  for (const item of file ? [...media, file] : media) {
    await providers.storage?.remove(item.key).catch(() => undefined);
    await officeService.returnFile(tenantId, item.bytes);
  }
};

// LMO-05: photo sent in the draft, with the quota reserved first (AD-120). The same id again is
// accepted without saving twice (resend after a network failure).
export const uploadMedia = async (
  providers: Pick<Providers, 'storage'>,
  tenantId: string,
  id: string,
  mediaId: string,
  file: { body: Buffer; mime: string },
): Promise<{ src: string }> => {
  if (!providers.storage) throw new CustomError('storage_not_configured', 503);
  if (!REPORT_MEDIA_LIMIT.mimes.includes(file.mime)) throw new CustomError('unsupported_file_type', 415, file.mime);
  if (file.body.length > REPORT_MEDIA_LIMIT.maxBytes) throw new CustomError('file_too_large', 413);
  const src = `/expert-reports/${id}/media/${mediaId}`;
  await editable(tenantId, id);
  const current = await reportRepository.listMedia(tenantId, id);
  if (current.some((media) => media.id === mediaId)) return { src };
  if (current.length >= REPORT_MEDIA_LIMIT.maxByReport) throw new CustomError('media_limit_reached', 422);
  const media = {
    id: mediaId,
    key: `tenants/${tenantId}/reports/${id}/${mediaId}`,
    bytes: file.body.length,
    mime: file.mime,
    createdAt: new Date(),
  };
  await officeService.reserveFile(tenantId, media.bytes);
  try {
    await providers.storage.put(media.key, file.body, media.mime);
    if (!(await reportRepository.addMedia(tenantId, id, media))) await officeService.returnFile(tenantId, media.bytes);
  } catch (error) {
    await officeService.returnFile(tenantId, media.bytes);
    throw error;
  }
  return { src };
};

export const getMedia = async (
  providers: Pick<Providers, 'storage'>,
  tenantId: string,
  id: string,
  mediaId: string,
): Promise<{ body: Buffer; mime: string }> => {
  const media = await reportRepository.findMedia(tenantId, id, mediaId);
  const body = media && providers.storage ? await providers.storage.get(media.key) : null;
  if (!media || !body) throw new ReportNotFoundError('not_found');
  return { body, mime: media.mime };
};

// Photo in the text → bytes: sent in the report (LMO-05) or from the inspection (AD-129); `null` if it is gone.
const readPhoto = (providers: Pick<Providers, 'storage'>, tenantId: string, src: string) => {
  const [, origin, id, , mediaId] = src.split('/');
  return origin === 'expert-reports'
    ? getMedia(providers, tenantId, id as string, mediaId as string).catch(() => null)
    : inspectionService.readReportPhoto(providers.storage, tenantId, src);
};

export const deleteByCase = (tenantId: string, caseId: string) => reportRepository.deleteByCase(tenantId, caseId);

// Export (LAU-03.2): same variables resolved again, without saving; pending → 422, except in the
// preview (LMO-04), where the marker stays in the text for the expert to see.
const toExport = async (providers: Providers, ctx: DocumentContext, id: string, preview = false) => {
  const report = await getReport(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, report.caseId);
  const { identity, expert, values } = await currentData(providers, ctx, legalCase, report.signatoryId);
  // Only the items that are part of the report leave (NLA-05).
  const sections = resolveSections(
    report.sections.filter((section) => section.included),
    values,
  );
  if (!preview) withoutIssues(sections);
  // Inspection photos in the text (AD-129): bytes read here, only from the same tenant.
  const srcs = [
    ...new Set(
      sections.flatMap((section) => [...section.html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1] as string)),
    ),
  ];
  const lidas = await Promise.all(
    srcs.map(async (src) => [src, await readPhoto(providers, ctx.tenantId, src)] as const),
  );
  const photos = Object.fromEntries(lidas.flatMap(([src, photo]) => (photo ? [[src, photo]] : [])));
  return { report: { ...report, sections }, legalCase, identity, expert, values, photos, generatedAt: ctx.now };
};

const fileName = (report: ReportRecord, legalCase: CaseRecord, extension: string): string =>
  `${report.type === 'technical_opinion' ? 'technical-opinion' : 'report'}-${legalCase.processNumber ?? legalCase.id}.${extension}`;

// Attached report (ANL-02): the PDF that was sent, with its name.
const attachedPdf = async (
  providers: Pick<Providers, 'storage'>,
  tenantId: string,
  id: string,
): Promise<GeneratedFile | null> => {
  const file = await reportRepository.fileOf(tenantId, id);
  if (!file) return null;
  const body = providers.storage ? await providers.storage.get(file.key) : null;
  if (!body) throw new ReportNotFoundError('not_found');
  // The name goes in the Content-Disposition header: only ASCII, without quotes.
  const name = file.name.normalize('NFD').replace(/[^\x20-\x7e]|"/g, '');
  return { name: /\.pdf$/i.test(name) ? name : `${name}.pdf`, type: 'application/pdf', conteudo: body };
};

export const generatePdf = async (
  providers: Providers,
  ctx: DocumentContext,
  id: string,
  { preview = false }: { preview?: boolean } = {},
): Promise<GeneratedFile> => {
  const attached = await attachedPdf(providers, ctx.tenantId, id);
  if (attached) return attached;
  const data = await toExport(providers, ctx, id, preview);
  return {
    name: fileName(data.report, data.legalCase, 'pdf'),
    type: 'application/pdf',
    conteudo: await providers.pdf.render(reportHtml(data)),
  };
};

export const generateDocx = async (providers: Providers, ctx: DocumentContext, id: string): Promise<GeneratedFile> => {
  // The attached report only exists as the PDF that was sent (ANL-02).
  if (await reportRepository.fileOf(ctx.tenantId, id)) throw new ReportNotFoundError('not_found');
  const data = await toExport(providers, ctx, id);
  return {
    name: fileName(data.report, data.legalCase, 'docx'),
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    conteudo: await reportDocx(data),
  };
};
