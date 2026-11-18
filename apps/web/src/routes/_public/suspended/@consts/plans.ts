import type { BillingPlan } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

// CHK-04: offered in this order; the trial only while the office never paid.
export const PLAN_OPTIONS: { plan: BillingPlan; name: string; description: string }[] = [
  { plan: 'trial', name: t('billing_trial'), description: t('billing_trial_help') },
  { plan: 'monthly', name: t('billing_monthly'), description: t('billing_monthly_help') },
  { plan: 'yearly', name: t('billing_yearly'), description: t('billing_yearly_help') },
  { plan: 'single_month', name: t('billing_single_month'), description: t('billing_single_month_help') },
];
