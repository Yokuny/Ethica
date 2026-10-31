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
  'pericia_already_registered',
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
