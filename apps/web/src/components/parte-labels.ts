import { PARTE_TIPOS, type ParteTipo, POLOS } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

// Rótulos de partes e polos (AD-117), usados pela perícia e pelo cadastro de partes.
// A chave de tradução é o próprio valor do enum.
export const PARTE_TIPO_ITEMS = PARTE_TIPOS.map((value) => ({ value, label: t(value) }));
export const POLO_ITEMS = POLOS.map((value) => ({ value, label: t(value) }));

// CPF/CNPJ chega só com dígitos; a tela mostra com pontuação.
export const formatDocumento = (documento?: string): string | undefined => {
  if (!documento) return undefined;
  if (documento.length === 11) return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Documento que identifica o cadastro na tela: CPF/CNPJ da parte ou OAB do advogado.
export const identificacaoDaParte = (parte: { tipo: ParteTipo; documento?: string; oab?: string }) =>
  parte.tipo === 'lawyer' ? (parte.oab ? `OAB ${parte.oab}` : undefined) : formatDocumento(parte.documento);
