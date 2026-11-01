import { REPORT_VARIABLES, type ReportStatus, type ReportVariable } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Label of each report variable with a sample value (LAU-01.3).
const VARIABLE_KEY: Record<ReportVariable, string> = {
  '[NUMERO_PROCESSO]': 'variable_process_number',
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

export const variableLabel = (variable: ReportVariable): string => t(VARIABLE_KEY[variable]);

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
