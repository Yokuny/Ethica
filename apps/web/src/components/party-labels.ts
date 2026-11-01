import { type CourtType, PARTY_TYPES, type PartyType, SIDES, type Side } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

// Party and side labels (AD-117), used by the case and by the party registry.
// The translation key is the enum value itself.
export const PARTY_TYPE_ITEMS = PARTY_TYPES.map((value) => ({ value, label: t(value) }));

// The labor court says reclamante/reclamada; civil and federal, autor/réu.
const LABOR_SIDE_KEY: Record<Side, string> = { plaintiff: 'claimant', defendant: 'respondent' };
export const sideLabel = (side: Side, courtType?: CourtType): string =>
  t(courtType === 'labor' ? LABOR_SIDE_KEY[side] : side);
export const sideItems = (courtType?: CourtType) =>
  SIDES.map((value) => ({ value, label: sideLabel(value, courtType) }));

// CPF/CNPJ arrives as digits only; the screen shows it with punctuation.
export const formatDocument = (document?: string): string | undefined => {
  if (!document) return undefined;
  if (document.length === 11) return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Document that identifies the record on screen: the party's CPF/CNPJ or the lawyer's OAB.
export const partyIdentification = (party: { type: PartyType; document?: string; oab?: string }) =>
  party.type === 'lawyer' ? (party.oab ? `OAB ${party.oab}` : undefined) : formatDocument(party.document);
