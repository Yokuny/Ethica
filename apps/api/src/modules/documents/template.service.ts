import { isDefaultTemplate, REPORT_LAYOUT_DEFAULT, type ReportLayout, type ReportType } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as importService from '../case/import.service.js';
import { templateSectionsFromDocx, templateSectionsFromText } from './report.attachment.js';
import { sanitizeReportHtml } from './report.html.js';
import { DEFAULT_TEMPLATES } from './report.library.js';
import type {
  CreateTemplate,
  ImportTemplateQuery,
  MoveSection,
  TemplateInput,
  TemplateRecord,
  TemplateSection,
  TemplateSummary,
  UpdateTemplate,
} from './report.schema.js';
import * as templateRepository from './template.repository.js';

export class TemplateNotFoundError extends KeyedError {}

const DEFAULT = DEFAULT_TEMPLATES;

// The default template is read-only (AD-126): the office clones it to adapt.
const ofOffice = (id: string): void => {
  if (isDefaultTemplate(id)) throw new CustomError('standard_template_read_only', 403);
};

const found = (template: TemplateRecord | null): TemplateRecord => {
  if (!template) throw new TemplateNotFoundError('not_found');
  return template;
};

const sanitized = (section: TemplateSection): TemplateSection => ({
  ...section,
  yesText: sanitizeReportHtml(section.yesText),
  noText: sanitizeReportHtml(section.noText),
});

export const listTemplates = async (tenantId: string, type?: ReportType): Promise<TemplateSummary[]> => [
  ...DEFAULT.filter((template) => !type || template.type === type).map(
    ({ sections, layout: _layout, ...template }) => ({
      ...template,
      totalSections: sections.length,
    }),
  ),
  ...(await templateRepository.list(tenantId, type)),
];

export const getTemplate = async (tenantId: string, id: string): Promise<TemplateRecord> =>
  DEFAULT.find((template) => template.id === id) ?? found(await templateRepository.findById(tenantId, id));

// Blank or cloning another template of the same type (LAU-01).
export const createTemplate = async (tenantId: string, data: CreateTemplate): Promise<TemplateRecord> => {
  const base = data.baseId ? await getTemplate(tenantId, data.baseId) : undefined;
  if (base && base.type !== data.type) throw new CustomError('report_template_type_mismatch', 422);
  return templateRepository.create(tenantId, {
    name: data.name,
    details: data.details || undefined,
    area: data.area || undefined,
    type: data.type,
    sections: (base?.sections ?? []).map(({ id: _id, ...section }) => section),
    layout: base?.layout ?? REPORT_LAYOUT_DEFAULT,
  });
};

// BIB-04: a PDF (by its text) or a Word file becomes an office template with the expert's layout (AD-203).
const isPdf = (file: Buffer): boolean => file.subarray(0, 5).toString('latin1') === '%PDF-';
export const importTemplate = async (
  tenantId: string,
  { name, type, area }: ImportTemplateQuery,
  file: Buffer,
): Promise<TemplateRecord> => {
  const sections = isPdf(file)
    ? templateSectionsFromText(await importService.extractPdfText(file), name)
    : templateSectionsFromDocx(file, name);
  if (!sections.length) throw new CustomError('pdf_without_text', 422);
  return templateRepository.create(tenantId, {
    name,
    area: area || undefined,
    type,
    sections: sections.map(sanitized),
    layout: REPORT_LAYOUT_DEFAULT,
  });
};

// Template saved from a report (AD-170): its items and texts, already chosen by the expert.
export const createFromReport = (tenantId: string, data: TemplateInput): Promise<TemplateRecord> =>
  templateRepository.create(tenantId, {
    ...data,
    details: data.details || undefined,
    area: data.area || undefined,
    sections: data.sections.map(sanitized),
  });

// Layout of the reports created from it (NLA-06).
export const setLayout = async (tenantId: string, id: string, layout: ReportLayout): Promise<TemplateRecord> => {
  ofOffice(id);
  return found(await templateRepository.setLayout(tenantId, id, layout));
};

export const updateTemplate = async (tenantId: string, id: string, data: UpdateTemplate): Promise<TemplateRecord> => {
  ofOffice(id);
  return found(await templateRepository.update(tenantId, id, data));
};

export const deleteTemplate = async (tenantId: string, id: string): Promise<void> => {
  ofOffice(id);
  const { deletedCount } = await templateRepository.remove(tenantId, id);
  if (deletedCount === 0) throw new TemplateNotFoundError('not_found');
};

export const addSection = async (tenantId: string, id: string, section: TemplateSection): Promise<TemplateRecord> => {
  ofOffice(id);
  return found(await templateRepository.addSection(tenantId, id, sanitized(section)));
};

export const updateSection = async (
  tenantId: string,
  id: string,
  sectionId: string,
  section: TemplateSection,
): Promise<TemplateRecord> => {
  ofOffice(id);
  return found(await templateRepository.updateSection(tenantId, id, sectionId, sanitized(section)));
};

export const removeSection = async (tenantId: string, id: string, sectionId: string): Promise<TemplateRecord> => {
  ofOffice(id);
  return found(await templateRepository.removeSection(tenantId, id, sectionId));
};

// Moves one position up or down; at the ends nothing changes.
export const moveSection = async (
  tenantId: string,
  id: string,
  sectionId: string,
  { direction }: MoveSection,
): Promise<TemplateRecord> => {
  ofOffice(id);
  const template = found(await templateRepository.findById(tenantId, id));
  const de = template.sections.findIndex((section) => section.id === sectionId);
  if (de < 0) throw new TemplateNotFoundError('not_found');
  const para = direction === 'up' ? de - 1 : de + 1;
  if (para < 0 || para >= template.sections.length) return template;
  const sections = [...template.sections];
  [sections[de], sections[para]] = [
    sections[para] as (typeof sections)[number],
    sections[de] as (typeof sections)[number],
  ];
  return found(await templateRepository.setSections(tenantId, id, sections));
};
