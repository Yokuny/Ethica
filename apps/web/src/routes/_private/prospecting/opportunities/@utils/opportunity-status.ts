import { OPPORTUNITY_STATUS, type OpportunityStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

export const OPPORTUNITY_STATUS_VARIANT: Record<OpportunityStatus, IndicatorVariant> = {
  new: 'info',
  under_review: 'warning',
  discarded: 'neutral',
  converted: 'success',
};

export const OPPORTUNITY_STATUS_ITEMS = OPPORTUNITY_STATUS.map((value) => ({ value, label: t(value) }));
