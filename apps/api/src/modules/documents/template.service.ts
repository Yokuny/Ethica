import { isDefaultTemplate, type ReportType } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import { sanitizeReportHtml } from './report.html.js';
import { DEFAULT_TEMPLATES } from './report.library.js';
import type { CreateTemplate, MoveSection, TemplateRecord, TemplateSection, TemplateSummary } from './report.schema.js';
import * as templateRepository from './template.repository.js';

export class TemplateNotFoundError extends KeyedError {}

const PADROES = Object.values(DEFAULT_TEMPLATES);

// Modelo padrão é só leitura (AD-126): o escritório clona para adaptar.
const ofOffice = (id: string): void => {
  if (isDefaultTemplate(id)) throw new CustomError('standard_template_read_only', 403);
};

const encontrado = (template: TemplateRecord | null): TemplateRecord => {
  if (!template) throw new TemplateNotFoundError('not_found');
  return template;
};

const saneada = (section: TemplateSection): TemplateSection => ({
  ...section,
  yesText: sanitizeReportHtml(section.yesText),
  noText: sanitizeReportHtml(section.noText),
});

export const listTemplates = async (tenantId: string, tipo?: ReportType): Promise<TemplateSummary[]> => [
  ...PADROES.filter((template) => !tipo || template.tipo === tipo).map(({ sections, ...template }) => ({
    ...template,
    totalSections: sections.length,
  })),
  ...(await templateRepository.list(tenantId, tipo)),
];

export const getTemplate = async (tenantId: string, id: string): Promise<TemplateRecord> =>
  PADROES.find((template) => template.id === id) ?? encontrado(await templateRepository.findById(tenantId, id));

// Em branco ou clonando outro modelo do mesmo tipo (LAU-01).
export const createTemplate = async (tenantId: string, data: CreateTemplate): Promise<TemplateRecord> => {
  const base = data.baseId ? await getTemplate(tenantId, data.baseId) : undefined;
  if (base && base.tipo !== data.tipo) throw new CustomError('report_template_type_mismatch', 422);
  return templateRepository.create(tenantId, {
    nome: data.nome,
    tipo: data.tipo,
    sections: (base?.sections ?? []).map(({ id: _id, ...section }) => section),
  });
};

export const renameTemplate = async (tenantId: string, id: string, nome: string): Promise<TemplateRecord> => {
  ofOffice(id);
  return encontrado(await templateRepository.updateNome(tenantId, id, nome));
};

export const deleteTemplate = async (tenantId: string, id: string): Promise<void> => {
  ofOffice(id);
  const { deletedCount } = await templateRepository.remove(tenantId, id);
  if (deletedCount === 0) throw new TemplateNotFoundError('not_found');
};

export const addSection = async (tenantId: string, id: string, section: TemplateSection): Promise<TemplateRecord> => {
  ofOffice(id);
  return encontrado(await templateRepository.addSection(tenantId, id, saneada(section)));
};

export const updateSection = async (
  tenantId: string,
  id: string,
  sectionId: string,
  section: TemplateSection,
): Promise<TemplateRecord> => {
  ofOffice(id);
  return encontrado(await templateRepository.updateSection(tenantId, id, sectionId, saneada(section)));
};

export const removeSection = async (tenantId: string, id: string, sectionId: string): Promise<TemplateRecord> => {
  ofOffice(id);
  return encontrado(await templateRepository.removeSection(tenantId, id, sectionId));
};

// Sobe ou desce uma posição; nas pontas não muda nada.
export const moveSection = async (
  tenantId: string,
  id: string,
  sectionId: string,
  { direcao }: MoveSection,
): Promise<TemplateRecord> => {
  ofOffice(id);
  const template = encontrado(await templateRepository.findById(tenantId, id));
  const de = template.sections.findIndex((section) => section.id === sectionId);
  if (de < 0) throw new TemplateNotFoundError('not_found');
  const para = direcao === 'up' ? de - 1 : de + 1;
  if (para < 0 || para >= template.sections.length) return template;
  const sections = [...template.sections];
  [sections[de], sections[para]] = [
    sections[para] as (typeof sections)[number],
    sections[de] as (typeof sections)[number],
  ];
  return encontrado(await templateRepository.setSections(tenantId, id, sections));
};
