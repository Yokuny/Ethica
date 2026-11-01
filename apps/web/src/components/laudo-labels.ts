import { LAUDO_VARIAVEIS, type LaudoStatus, type LaudoVariavel } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Rótulo de cada variável do laudo com um exemplo de valor (LAU-01.3).
const VARIAVEL_KEY: Record<LaudoVariavel, string> = {
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

export const variavelLabel = (variavel: LaudoVariavel): string => t(VARIAVEL_KEY[variavel]);

export const variavelItems = LAUDO_VARIAVEIS.map((variavel) => ({
  value: variavel,
  label: `${variavel} — ${variavelLabel(variavel)}`,
}));

// Laudo é masculino: rótulo próprio em vez do `completed` da perícia ("Concluída").
const LAUDO_STATUS_KEY: Record<LaudoStatus, string> = { draft: 'draft', completed: 'completed_report' };
export const laudoStatusLabel = (status: LaudoStatus): string => t(LAUDO_STATUS_KEY[status]);

export const LAUDO_STATUS_VARIANT: Record<LaudoStatus, IndicatorVariant> = {
  draft: 'warning',
  completed: 'success',
};
