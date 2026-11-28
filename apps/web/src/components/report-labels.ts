import {
  REPORT_VARIABLES,
  type ReportStatus,
  type ReportVariable,
  TEMPLATE_AREAS,
  type TemplateArea,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Label of each report variable with a sample value (LAU-01.3).
const VARIABLE_KEY: Record<ReportVariable, string> = {
  '[NUMERO_PROCESSO]': 'variable_process_number',
  '[NUMERO_OS]': 'variable_service_order',
  '[TRIBUNAL]': 'variable_court',
  '[VARA]': 'variable_court_division',
  '[COMARCA]': 'variable_district',
  '[JUSTICA]': 'variable_jurisdiction',
  '[OBJETO]': 'variable_subject',
  '[NOME_AUTOR]': 'variable_plaintiff_name',
  '[NOME_REU]': 'variable_defendant_name',
  '[DENOMINACAO_AUTOR]': 'variable_plaintiff_title',
  '[DENOMINACAO_REU]': 'variable_defendant_title',
  '[ADVOGADOS_AUTOR]': 'variable_plaintiff_lawyers',
  '[ADVOGADOS_REU]': 'variable_defendant_lawyers',
  '[DATA_NOMEACAO]': 'variable_appointment_date',
  '[DATA_VISTORIA]': 'variable_inspection_date',
  '[LOCAL_PERICIA]': 'variable_inspection_place',
  '[FUNCAO_RECLAMANTE]': 'variable_worker_role',
  '[DATA_ADMISSAO]': 'variable_hiring_date',
  '[DATA_DEMISSAO]': 'variable_dismissal_date',
  '[PERIODO_IMPRESCRITO]': 'variable_claim_period',
  '[DATA_EXTENSO]': 'variable_date_in_full',
  '[PERITO_NOME]': 'variable_expert_name',
  '[PERITO_REGISTRO]': 'variable_expert_registration',
  '[PERITO_FORMACAO]': 'variable_expert_degree',
  '[ESCRITORIO_NOME]': 'variable_office_name',
  '[HORA_VISTORIA]': 'variable_inspection_time',
  '[PRESENTES_VISTORIA]': 'variable_inspection_attendees',
  '[PARADIGMAS_AUTOR]': 'variable_plaintiff_paradigms',
  '[PARADIGMAS_REU]': 'variable_defendant_paradigms',
  '[FUNCOES_AUTOR]': 'variable_plaintiff_roles',
  '[FUNCOES_REU]': 'variable_defendant_roles',
  '[AGENTES_PRESENTES]': 'variable_agents_present',
  '[AGENTES_AUSENTES]': 'variable_agents_absent',
  '[DOCUMENTOS_SOLICITADOS]': 'variable_requested_documents',
};

// Text of an item without tags, for the line beside the title of a closed item (NLA-05).
export const plainText = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const variableLabel = (variable: ReportVariable): string => t(VARIABLE_KEY[variable]);

// Variables that only get a value after the inspection is recorded: the pending item says "vistoria" (NLA-05).
export const INSPECTION_VARIABLES: readonly ReportVariable[] = [
  '[DATA_VISTORIA]',
  '[HORA_VISTORIA]',
  '[PRESENTES_VISTORIA]',
  '[PARADIGMAS_AUTOR]',
  '[PARADIGMAS_REU]',
  '[FUNCOES_AUTOR]',
  '[FUNCOES_REU]',
  '[AGENTES_PRESENTES]',
  '[AGENTES_AUSENTES]',
  '[DOCUMENTOS_SOLICITADOS]',
];

export const variableItems = REPORT_VARIABLES.map((variable) => ({
  value: variable,
  label: `${variable} — ${variableLabel(variable)}`,
}));

// "Laudo" is masculine: its own label instead of the case `completed` ("Concluída").
const REPORT_STATUS_KEY: Record<ReportStatus, string> = { draft: 'draft', completed: 'completed_report' };
export const reportStatusLabel = (status: ReportStatus): string => t(REPORT_STATUS_KEY[status]);

export const REPORT_STATUS_VARIANT: Record<ReportStatus, IndicatorVariant> = {
  draft: 'warning',
  completed: 'success',
};

// Area of practice of a template (AD-204, AD-310): the sphere of the perícia or the other service type.
const TEMPLATE_AREA_KEY: Record<TemplateArea, string> = {
  labor: 'labor_expert_examination',
  civil: 'civil_expert_examination',
  federal: 'federal_expert_examination',
  technical_assistance: 'technical_assistance',
  partnership: 'partnership',
  private_service: 'private_service',
};
export const templateAreaLabel = (area?: TemplateArea): string => (area ? t(TEMPLATE_AREA_KEY[area]) : t('no_area'));
export const TEMPLATE_AREA_ITEMS = TEMPLATE_AREAS.map((value) => ({ value, label: templateAreaLabel(value) }));
