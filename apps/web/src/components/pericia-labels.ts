import {
  JUSTICAS,
  type Justica,
  PAPEIS_PERICIA,
  PERICIA_FASES,
  PERICIA_FASES_POR_ETAPA,
  PERICIA_FASES_SUSPENSAO,
  PERICIA_SITUACOES,
  PERICIA_STATUS,
  type PericiaSituacao,
  type PericiaStatus,
} from '@ethica/contracts';
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

// Fase detalhada e situação (AD-133). A chave da fase é o próprio valor, como a etapa.
export const faseLabel = (fase: string): string => t(fase);
export const SEM_FASE = 'none';
// No formulário: as fases da etapa escolhida, as de suspensão e "sem fase".
export const faseItems = (status: PericiaStatus) => [
  { value: SEM_FASE, label: t('no_detailed_phase') },
  ...[
    ...PERICIA_FASES_POR_ETAPA[status],
    ...(['completed', 'declined'].includes(status) ? [] : PERICIA_FASES_SUSPENSAO),
  ].map((value) => ({ value, label: faseLabel(value) })),
];
export const PERICIA_FASE_ITEMS = PERICIA_FASES.map((value) => ({ value, label: faseLabel(value) }));
export const PERICIA_SITUACAO_VARIANT: Record<PericiaSituacao, IndicatorVariant> = {
  active: 'success',
  suspended: 'warning',
  closed: 'neutral',
};
const SITUACAO_KEY: Record<PericiaSituacao, string> = {
  active: 'situation_active',
  suspended: 'situation_suspended',
  closed: 'situation_closed',
};
export const situacaoLabel = (situacao: PericiaSituacao): string => t(SITUACAO_KEY[situacao]);
export const PERICIA_SITUACAO_ITEMS = PERICIA_SITUACOES.map((value) => ({ value, label: situacaoLabel(value) }));
// A chave da justiça leva sufixo (`civil` sozinho seria ambíguo no dicionário).
const JUSTICA_KEY: Record<Justica, string> = {
  labor: 'labor_court',
  civil: 'civil_court',
  federal: 'federal_court',
};
export const justicaLabel = (justica: Justica): string => t(JUSTICA_KEY[justica]);

export const JUSTICA_ITEMS = JUSTICAS.map((value) => ({ value, label: justicaLabel(value) }));
export const PAPEL_ITEMS = PAPEIS_PERICIA.map((value) => ({ value, label: t(value) }));
