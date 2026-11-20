import type { BillingPlan } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

export type PlanOption = {
  plan: BillingPlan;
  name: string;
  period: string;
  description: string;
  features: string[];
};

const ALL_FEATURES = t('billing_all_features');

// CHK-04: the card subscription is the middle card; the toggle switches it between monthly and yearly.
export const SUBSCRIPTION_OPTIONS: Record<'monthly' | 'yearly', PlanOption> = {
  monthly: {
    plan: 'monthly',
    name: t('billing_monthly'),
    period: t('per_month'),
    description: t('billing_monthly_help'),
    features: [ALL_FEATURES, t('billing_card_renewal')],
  },
  yearly: {
    plan: 'yearly',
    name: t('billing_yearly'),
    period: t('per_year'),
    description: t('billing_yearly_help'),
    features: [ALL_FEATURES, t('billing_card_renewal'), t('billing_yearly_discount')],
  },
};

// Offered only while the office never paid.
export const TRIAL_OPTION: PlanOption = {
  plan: 'trial',
  name: t('billing_trial'),
  period: t('billing_trial_period'),
  description: t('billing_trial_help'),
  features: [ALL_FEATURES, t('billing_no_renewal'), t('billing_once_per_office')],
};

export const SINGLE_MONTH_OPTION: PlanOption = {
  plan: 'single_month',
  name: t('billing_single_month'),
  period: t('billing_single_month_period'),
  description: t('billing_single_month_help'),
  features: [ALL_FEATURES, t('billing_any_method'), t('billing_no_renewal')],
};
