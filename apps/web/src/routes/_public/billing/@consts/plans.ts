import { BILLING_PLAN_CENTS, BILLING_TRIAL_DAYS, type BillingPlan } from '@ethica/contracts';
import { CreditCardIcon, type LucideIcon, WalletIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';

export type PlanOption = {
  plan: BillingPlan;
  name: string;
  period: string;
  // Price it is compared with, shown struck through: the same time on the monthly plan.
  referenceCents?: number;
  // Yearly: the price per month it amounts to.
  perMonthCents?: number;
  methodIcon: LucideIcon;
  method: string;
  advantage: string;
};

const MONTHLY = BILLING_PLAN_CENTS.monthly;

// CHK-04: offered in this order; the trial only while the office never paid. The monthly
// subscription opens centered.
export const PLAN_OPTIONS: PlanOption[] = [
  {
    plan: 'trial',
    name: t('billing_trial'),
    period: t('billing_trial_period'),
    referenceCents: Math.round((MONTHLY * BILLING_TRIAL_DAYS) / 30),
    methodIcon: WalletIcon,
    method: t('billing_method_any'),
    advantage: t('billing_trial_advantage'),
  },
  {
    plan: 'monthly',
    name: t('billing_monthly'),
    period: t('per_month'),
    methodIcon: CreditCardIcon,
    method: t('billing_method_card'),
    advantage: t('billing_monthly_advantage'),
  },
  {
    plan: 'yearly',
    name: t('billing_yearly'),
    period: t('per_year'),
    referenceCents: MONTHLY * 12,
    perMonthCents: Math.round(BILLING_PLAN_CENTS.yearly / 12),
    methodIcon: CreditCardIcon,
    method: t('billing_method_card'),
    advantage: t('billing_yearly_advantage'),
  },
  {
    plan: 'single_month',
    name: t('billing_single_month'),
    period: t('billing_single_month_period'),
    methodIcon: WalletIcon,
    method: t('billing_method_any'),
    advantage: t('billing_single_month_advantage'),
  },
];

// What the office gets on any plan (PRODUCT.md): the same list closes every card.
export const BENEFITS = [
  t('billing_benefit_deadlines'),
  t('billing_benefit_fees'),
  t('billing_benefit_reports'),
  t('billing_benefit_field'),
  t('billing_benefit_team'),
];
