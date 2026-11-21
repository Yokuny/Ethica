import { BILLING_PLAN_CENTS, type BillingPlan } from '@ethica/contracts';
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  FileTextIcon,
  type LucideIcon,
  MapPinIcon,
  PiggyBankIcon,
  RefreshCwIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

export type PlanFeature = { icon: LucideIcon; text: string };

export type PlanOption = {
  plan: BillingPlan;
  name: string;
  tagline: string;
  // The big number of the card: what the plan costs per month, so the plans compare at a glance.
  perMonthCents: number;
  // Price shown struck through before it: what the same month costs on the monthly.
  referenceCents?: number;
  unit: string;
  // How the price is charged, under the number.
  charge: string;
  cta: string;
  method: string;
  renewal: string;
  team: string;
  // The plan whose features this one also has ("Tudo do Teste, e mais").
  includes?: BillingPlan;
  features: PlanFeature[];
};

const MONTHLY = BILLING_PLAN_CENTS.monthly;
const YEARLY_PER_MONTH_CENTS = Math.round(BILLING_PLAN_CENTS.yearly / 12);
export const YEARLY_SAVING_CENTS = MONTHLY * 12 - BILLING_PLAN_CENTS.yearly;

// CHK-04: offered in this order; the trial only while the office never paid. The monthly opens
// centered and is the recommended one. The single month is the monthly paid by boleto or PIX, offered
// inside the monthly card (AD-250).
export const PLAN_OPTIONS: PlanOption[] = [
  {
    plan: 'trial',
    name: t('billing_trial'),
    tagline: t('billing_trial_tagline'),
    perMonthCents: BILLING_PLAN_CENTS.trial,
    referenceCents: MONTHLY,
    unit: t('billing_trial_period').toLowerCase(),
    charge: t('billing_trial_charge'),
    cta: t('billing_trial_cta'),
    method: t('billing_method_any'),
    renewal: t('billing_renewal_none'),
    team: t('billing_team_solo'),
    features: [
      { icon: CalendarClockIcon, text: t('billing_benefit_deadlines') },
      { icon: WalletIcon, text: t('billing_benefit_fees') },
      { icon: FileTextIcon, text: t('billing_benefit_reports') },
      { icon: MapPinIcon, text: t('billing_benefit_field') },
    ],
  },
  {
    plan: 'monthly',
    name: t('billing_monthly'),
    tagline: t('billing_monthly_tagline'),
    perMonthCents: MONTHLY,
    unit: `/${t('month').toLowerCase()}`,
    charge: t('billing_monthly_charge'),
    cta: t('billing_monthly_cta'),
    method: t('billing_method_monthly'),
    renewal: t('billing_renewal_monthly'),
    team: t('billing_team_unlimited'),
    includes: 'trial',
    features: [
      { icon: UsersIcon, text: t('billing_benefit_team') },
      { icon: RefreshCwIcon, text: t('billing_benefit_renewal') },
    ],
  },
  {
    plan: 'yearly',
    name: t('billing_yearly'),
    tagline: t('billing_yearly_tagline'),
    perMonthCents: YEARLY_PER_MONTH_CENTS,
    unit: `/${t('month').toLowerCase()}`,
    charge: `${formatMoney(BILLING_PLAN_CENTS.yearly)} ${t('billing_yearly_charge')}`,
    cta: t('billing_yearly_cta'),
    method: t('billing_method_card'),
    renewal: t('billing_renewal_yearly'),
    team: t('billing_team_unlimited'),
    includes: 'monthly',
    features: [
      {
        icon: PiggyBankIcon,
        text: `${formatMoney(YEARLY_PER_MONTH_CENTS)} ${t('per_month').toLowerCase()} ${t('billing_instead_of')} ${formatMoney(MONTHLY)}`,
      },
      { icon: CalendarCheckIcon, text: t('billing_benefit_one_payment') },
    ],
  },
];

// What every plan has, the rows checked in all columns of the comparison.
export const CORE_FEATURES = PLAN_OPTIONS[0]?.features ?? [];
