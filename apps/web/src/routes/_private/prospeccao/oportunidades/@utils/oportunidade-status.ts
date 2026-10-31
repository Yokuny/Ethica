import { OPORTUNIDADE_STATUS, type OportunidadeStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

export const OPORTUNIDADE_STATUS_VARIANT: Record<OportunidadeStatus, IndicatorVariant> = {
  new: 'info',
  under_review: 'warning',
  discarded: 'neutral',
  converted: 'success',
};

export const OPORTUNIDADE_STATUS_ITEMS = OPORTUNIDADE_STATUS.map((value) => ({ value, label: t(value) }));
