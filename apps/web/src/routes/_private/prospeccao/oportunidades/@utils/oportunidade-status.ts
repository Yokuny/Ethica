import { OPORTUNIDADE_STATUS, type OportunidadeStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

export const OPORTUNIDADE_STATUS_VARIANT: Record<OportunidadeStatus, IndicatorVariant> = {
  nova: 'info',
  em_analise: 'warning',
  descartada: 'neutral',
  convertida: 'success',
};

export const OPORTUNIDADE_STATUS_ITEMS = OPORTUNIDADE_STATUS.map((value) => ({ value, label: t(value) }));
