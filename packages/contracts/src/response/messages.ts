// Every ApiResponse `message` is a translation KEY, never ready-made text:
// the back-end only picks the key, the front-end (apps/web, `t()` from
// translate.helper.ts) translates it. This list is the contract between the two
// sides — `respObj`/`badRespObj`/`CustomError` only accept `ApiMessageKey`, and the
// web guard test (translate.helper.unit.test.ts) catches any key
// from here missing in the dictionary. Same key rules as apps/web/CLAUDE.md
// ("Tradução"): flat snake_case, names the text (never the screen/entity),
// reuses a generic one before creating a new one. Technical detail (invalid
// field, id, name) never goes in the key — it goes in the server log.
export const API_MESSAGE_KEYS = [
  // Generic
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
  // Authentication and access
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
  // Cases
  'expert_case_already_registered',
  'phase_stage_mismatch',
  'invalid_contracting_party',
  'party_not_found',
  // Case import (AD-114, AD-115, AD-118): file, CSV row and PDF warnings
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
  // Office files (AD-120)
  'storage_not_configured',
  'storage_quota_exceeded',
  // Laudos (AD-126)
  'standard_template_read_only',
  'report_template_type_mismatch',
  'report_completed',
  'report_needs_section',
  'report_unresolved_variables',
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
  // Prospecting (Datajud)
  'datajud_unavailable',
  'datajud_not_configured',
  'opportunity_already_saved',
  'opportunity_already_converted',
] as const;

export type ApiMessageKey = (typeof API_MESSAGE_KEYS)[number];

const apiMessageKeySet: ReadonlySet<string> = new Set(API_MESSAGE_KEYS);

export const isApiMessageKey = (value: unknown): value is ApiMessageKey =>
  typeof value === 'string' && apiMessageKeySet.has(value);
