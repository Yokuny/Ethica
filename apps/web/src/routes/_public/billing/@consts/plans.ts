import { BILLING_PLAN_CENTS, type BillingPlan } from '@ethica/contracts';
import { CreditCardIcon, type LucideIcon, WalletIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';

export type PlanOption = {
  plan: BillingPlan;
  name: string;
  tagline: string;
  period: string;
  // Price it is compared with, shown struck through: the same time on the monthly plan.
  referenceCents?: number;
  perMonthCents: number;
  methodIcon: LucideIcon;
  method: string;
  advantage: string;
  renewal: string;
  team: string;
  // The plan whose features this one also has ("Tudo do Teste, e mais").
  includes?: BillingPlan;
  features: string[];
};

const MONTHLY = BILLING_PLAN_CENTS.monthly;

// CHK-04: offered in this order; the trial only while the office never paid. The monthly
// subscription opens centered and is the recommended one.
export const PLAN_OPTIONS: PlanOption[] = [
  {
    plan: 'trial',
    name: t('billing_trial'),
    tagline: t('billing_trial_tagline'),
    period: t('billing_trial_period'),
    referenceCents: MONTHLY,
    perMonthCents: BILLING_PLAN_CENTS.trial,
    methodIcon: WalletIcon,
    method: t('billing_method_any'),
    advantage: t('billing_trial_advantage'),
    renewal: t('billing_renewal_none'),
    team: t('billing_team_solo'),
    features: [
      t('billing_benefit_deadlines'),
      t('billing_benefit_fees'),
      t('billing_benefit_reports'),
      t('billing_benefit_field'),
    ],
  },
  {
    plan: 'monthly',
    name: t('billing_monthly'),
    tagline: t('billing_monthly_tagline'),
    period: t('per_month'),
    perMonthCents: MONTHLY,
    methodIcon: CreditCardIcon,
    method: t('billing_method_card'),
    advantage: t('billing_monthly_advantage'),
    renewal: t('billing_renewal_monthly'),
    team: t('billing_team_unlimited'),
    includes: 'trial',
    features: [t('billing_benefit_team')],
  },
  {
    plan: 'yearly',
    name: t('billing_yearly'),
    tagline: t('billing_yearly_tagline'),
    period: t('per_year'),
    referenceCents: MONTHLY * 12,
    perMonthCents: Math.round(BILLING_PLAN_CENTS.yearly / 12),
    methodIcon: CreditCardIcon,
    method: t('billing_method_card'),
    advantage: t('billing_yearly_advantage'),
    renewal: t('billing_renewal_yearly'),
    team: t('billing_team_unlimited'),
    includes: 'monthly',
    features: [],
  },
  {
    plan: 'single_month',
    name: t('billing_single_month'),
    tagline: t('billing_single_month_tagline'),
    period: t('billing_single_month_period'),
    perMonthCents: BILLING_PLAN_CENTS.single_month,
    methodIcon: WalletIcon,
    method: t('billing_method_any'),
    advantage: t('billing_single_month_advantage'),
    renewal: t('billing_renewal_none'),
    team: t('billing_team_unlimited'),
    includes: 'monthly',
    features: [],
  },
];

// What every plan has, the rows checked in all columns of the comparison.
export const CORE_FEATURES = PLAN_OPTIONS[0]?.features ?? [];
