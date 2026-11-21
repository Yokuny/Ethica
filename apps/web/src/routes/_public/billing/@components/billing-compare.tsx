import type { BillingPlan } from '@ethica/contracts';
import { BILLING_PLAN_CENTS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';
import { Fragment } from 'react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CORE_FEATURES, type PlanOption } from '../@consts/plans.js';

type BillingCompareProps = {
  options: PlanOption[];
  paying?: BillingPlan;
  onPay?: (plan: BillingPlan) => void;
};

// "Compare plans" of the shadcnblocks model (pricing.html): each plan heads a column with its price and
// Pagar; below, what changes between the plans, then what all of them have.
export function BillingCompare({ options, paying, onPay }: BillingCompareProps) {
  const groups: { title: string; rows: { label: string; value: (option: PlanOption) => string | undefined }[] }[] = [
    {
      title: t('billing_group_plan'),
      rows: [
        { label: t('payment'), value: (option) => option.method },
        { label: t('billing_renewal'), value: (option) => option.renewal },
        { label: t('billing_price_per_month'), value: (option) => formatMoney(option.perMonthCents) },
        { label: t('billing_team'), value: (option) => option.team },
      ],
    },
    {
      title: t('billing_group_routine'),
      rows: CORE_FEATURES.map((feature) => ({ label: feature, value: () => undefined })),
    },
  ];
  const column = (option: PlanOption) => cn('border-l border-border/50', option.plan === 'monthly' && 'bg-muted/30');

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className="w-[28%] border-b p-6 text-left align-top">
              <div className="flex flex-col gap-2">
                <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                  render={<h3 />}
                  className="text-lg font-semibold"
                >
                  {t('billing_compare_title')}
                </ItemTitle>
                <ItemDescription className="line-clamp-none font-normal">{t('billing_compare_help')}</ItemDescription>
              </div>
            </th>
            {options.map((option) => (
              <th key={option.plan} className={cn('border-b p-6 text-center align-top', column(option))}>
                <div className="flex flex-col items-center gap-3">
                  <ItemTitle className="justify-center text-base font-medium">{option.name}</ItemTitle>
                  <ItemTitle className="justify-center text-3xl font-semibold tracking-tight">
                    {formatMoney(BILLING_PLAN_CENTS[option.plan])}
                  </ItemTitle>
                  <ItemDescription className="text-xs">{option.period}</ItemDescription>
                  <ItemDescription className="line-clamp-none max-w-48 text-xs font-normal">
                    {option.tagline}
                  </ItemDescription>
                  {onPay && (
                    <Button
                      className="mt-3 w-full max-w-44"
                      size="sm"
                      variant={option.plan === 'monthly' ? 'default' : 'outline'}
                      disabled={Boolean(paying)}
                      onClick={() => onPay(option.plan)}
                    >
                      {t('pay')}
                    </Button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.title}>
              <tr>
                <td colSpan={options.length + 1} className="bg-muted/20 px-6 py-3">
                  <ItemDescription className="text-xs font-semibold tracking-wider uppercase">
                    {group.title}
                  </ItemDescription>
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-b border-border/40 last:border-b-0">
                  <td className="px-6 py-3.5">
                    <ItemDescription className="line-clamp-none text-foreground">{row.label}</ItemDescription>
                  </td>
                  {options.map((option) => {
                    const value = row.value(option);
                    return (
                      <td key={option.plan} className={cn('px-6 py-3.5 text-center', column(option))}>
                        {value ? (
                          <ItemDescription className="line-clamp-none justify-center text-foreground">
                            {value}
                          </ItemDescription>
                        ) : (
                          <CheckIcon className="mx-auto size-5 text-primary" aria-label={t('yes')} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
