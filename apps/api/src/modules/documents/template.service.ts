import { isDefaultTemplate, type ReportType } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import { sanitizeReportHtml } from './report.html.js';
import { DEFAULT_TEMPLATES } from './report.library.js';
import type { CreateTemplate, MoveSection, TemplateRecord, TemplateSection, TemplateSummary } from './report.schema.js';
import * as templateRepository from './template.repository.js';

export class TemplateNotFoundError extends KeyedError {}

const DEFAULT = Object.values(DEFAULT_TEMPLATES);

// Modelo padrão é só leitura (AD-126): o escritório clona para adaptar.
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
  ...DEFAULT.filter((template) => !type || template.type === type).map(({ sections, ...template }) => ({
    ...template,
    totalSections: sections.length,
  })),
  ...(await templateRepository.list(tenantId, type)),
];

export const getTemplate = async (tenantId: string, id: string): Promise<TemplateRecord> =>
  DEFAULT.find((template) => template.id === id) ?? found(await templateRepository.findById(tenantId, id));

// Em branco ou clonando outro modelo do mesmo tipo (LAU-01).
export const createTemplate = async (tenantId: string, data: CreateTemplate): Promise<TemplateRecord> => {
  const base = data.baseId ? await getTemplate(tenantId, data.baseId) : undefined;
  if (base && base.type !== data.type) throw new CustomError('report_template_type_mismatch', 422);
  return templateRepository.create(tenantId, {
    name: data.name,
    type: data.type,
    sections: (base?.sections ?? []).map(({ id: _id, ...section }) => section),
  });
};

export const renameTemplate = async (tenantId: string, id: string, name: string): Promise<TemplateRecord> => {
  ofOffice(id);
  return found(await templateRepository.updateName(tenantId, id, name));
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

// Sobe ou desce uma posição; nas pontas não muda nada.
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
