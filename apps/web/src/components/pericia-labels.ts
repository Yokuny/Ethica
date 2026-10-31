import { JUSTICAS, type Justica, PAPEIS_PERICIA, PERICIA_STATUS, type PericiaStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Rótulos e tons de status da perícia, compartilhados por listagem, detalhe,
// início e gráficos. A chave de tradução é o próprio valor do enum.
export const PERICIA_STATUS_VARIANT: Record<PericiaStatus, IndicatorVariant> = {
  appointed: 'info',
  accepted: 'info',
  inspection: 'violet',
  drafting_report: 'warning',
  report_delivered: 'success',
  clarifications: 'orange',
  completed: 'success',
  declined: 'neutral',
};

export const PERICIA_STATUS_ITEMS = PERICIA_STATUS.map((value) => ({ value, label: t(value) }));
// A chave da justiça leva sufixo (`civil` sozinho seria ambíguo no dicionário).
const JUSTICA_KEY: Record<Justica, string> = {
  labor: 'labor_court',
  civil: 'civil_court',
  federal: 'federal_court',
};
export const justicaLabel = (justica: Justica): string => t(JUSTICA_KEY[justica]);

export const JUSTICA_ITEMS = JUSTICAS.map((value) => ({ value, label: justicaLabel(value) }));
export const PAPEL_ITEMS = PAPEIS_PERICIA.map((value) => ({ value, label: t(value) }));
