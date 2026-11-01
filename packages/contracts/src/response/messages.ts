// Toda `message` de ApiResponse é uma CHAVE de tradução, nunca texto pronto:
// o back-end só escolhe a chave, o front-end (apps/web, `t()` de
// translate.helper.ts) é quem a traduz. Esta lista é o contrato entre os dois
// lados — `respObj`/`badRespObj`/`CustomError` só aceitam `ApiMessageKey`, e o
// teste-guarda do web (translate.helper.unit.test.ts) trava qualquer chave
// daqui que falte no dicionário. Mesmas regras de chave de apps/web/CLAUDE.md
// ("Tradução"): snake_case plana, nomeia o texto (nunca a tela/entidade),
// reaproveita uma genérica antes de criar uma nova. Detalhe técnico (campo
// inválido, id, nome) nunca vai na chave — vai no log do servidor.
export const API_MESSAGE_KEYS = [
  // Genéricas
  'not_found',
  'already_exists',
  'request_conflict',
  'invalid_data',
  'invalid_filters',
  'search_unavailable',
  'load_error',
  'internal_error',
  'too_many_attempts',
  'created_successfully',
  'removed_successfully',
  // Autenticação e acesso
  'invalid_credentials',
  'invalid_session',
  'invalid_access',
  'no_permission',
  'company_link_required',
  'tenant_suspended',
  'admin_has_all_permissions',
  'signed_in_successfully',
  'signed_out_successfully',
  'wrong_current_password',
  // Convites e links
  'invalid_link',
  'expired_link',
  'used_link',
  'email_already_registered',
  'pending_invite_exists',
  'invite_email_failed',
  // Perícias
  'expert_case_already_registered',
  'phase_stage_mismatch',
  'invalid_contracting_party',
  'party_not_found',
  // Importação de perícias (AD-114, AD-115, AD-118): arquivo, linha do CSV e avisos do PDF
  'unsupported_file_type',
  'file_too_large',
  'pdf_without_text',
  'csv_empty',
  'csv_invalid_header',
  'csv_too_many_rows',
  'invalid_process_number',
  'invalid_date',
  'invalid_field',
  'missing_required_field',
  'unsupported_court',
  'multiple_process_numbers',
  'deadline_calculated',
  // Arquivos do escritório (AD-120)
  'storage_not_configured',
  'storage_quota_exceeded',
  // Laudos (AD-126)
  'standard_template_read_only',
  'report_template_type_mismatch',
  'report_completed',
  'report_needs_section',
  'laudo_unresolved_variables',
  // Campo e vistorias (AD-128 a AD-131)
  'inspection_conflict',
  'media_limit_reached',
  'inspection_requires_case',
  'no_recipients',
  'geocoding_unavailable',
  'notice_sent',
  // Financeiro (AD-111)
  'parcel_exceeds_balance',
  'fee_cannot_be_removed',
  'fee_status_comes_from_parcels',
  'amount_below_received',
  // Prospecção (Datajud)
  'datajud_unavailable',
  'datajud_not_configured',
  'opportunity_already_saved',
  'opportunity_already_converted',
] as const;

export type ApiMessageKey = (typeof API_MESSAGE_KEYS)[number];

const apiMessageKeySet: ReadonlySet<string> = new Set(API_MESSAGE_KEYS);

export const isApiMessageKey = (value: unknown): value is ApiMessageKey =>
  typeof value === 'string' && apiMessageKeySet.has(value);
