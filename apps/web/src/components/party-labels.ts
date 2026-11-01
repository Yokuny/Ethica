import { PARTY_TYPES, type PartyType, SIDES } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

// Rótulos de partes e polos (AD-117), usados pela perícia e pelo cadastro de partes.
// A chave de tradução é o próprio valor do enum.
export const PARTY_TYPE_ITEMS = PARTY_TYPES.map((value) => ({ value, label: t(value) }));
export const SIDE_ITEMS = SIDES.map((value) => ({ value, label: t(value) }));

// CPF/CNPJ chega só com dígitos; a tela mostra com pontuação.
export const formatDocumento = (documento?: string): string | undefined => {
  if (!documento) return undefined;
  if (documento.length === 11) return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Documento que identifica o cadastro na tela: CPF/CNPJ da parte ou OAB do advogado.
export const partyIdentification = (party: { tipo: PartyType; documento?: string; oab?: string }) =>
  party.tipo === 'lawyer' ? (party.oab ? `OAB ${party.oab}` : undefined) : formatDocumento(party.documento);
