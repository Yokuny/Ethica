import type { BillingPlan } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { BriefcaseBusinessIcon, CheckIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { Fragment } from 'react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CORE_FEATURES, type PlanOption } from '../@consts/plans.js';

type BillingCompareProps = {
  options: PlanOption[];
  paying?: BillingPlan;
  onPay?: (plan: BillingPlan) => void;
};

// Comparison in the Vercel model: the plan names stay on top while the groups scroll by; each group
// says what it covers. A cell without value is a check: every plan has it.
export function BillingCompare({ options, paying, onPay }: BillingCompareProps) {
  const groups = [
    {
      icon: WalletIcon,
      title: t('billing_group_price'),
      description: t('billing_group_price_help'),
      rows: [
        { label: t('billing_price_per_month'), value: (option: PlanOption) => formatMoney(option.perMonthCents) },
        { label: t('billing_charge'), value: (option: PlanOption) => option.charge },
        { label: t('payment'), value: (option: PlanOption) => option.method },
        { label: t('billing_renewal'), value: (option: PlanOption) => option.renewal },
      ],
    },
    {
      icon: UsersIcon,
      title: t('billing_team'),
      description: t('billing_group_team_help'),
      rows: [{ label: t('billing_team_people'), value: (option: PlanOption) => option.team }],
    },
    {
      icon: BriefcaseBusinessIcon,
      title: t('billing_group_routine'),
      description: t('billing_group_routine_help'),
      rows: CORE_FEATURES.map((feature) => ({ label: feature.text, value: (_: PlanOption) => undefined })),
    },
  ];
  const column = (option: PlanOption) => cn('border-l border-border/50', option.plan === 'monthly' && 'bg-muted/30');

  return (
    <div className="flex flex-col gap-6">
      <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
        render={<h3 />}
        className="text-2xl font-semibold tracking-tight"
      >
        {t('billing_compare_title')}
      </ItemTitle>
      {/* Scrolls sideways on the phone; on wider screens the header sticks to the top of the page. */}
      <div className="overflow-x-auto rounded-xl border md:overflow-visible">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              <th className="w-[34%] border-b bg-background p-4 text-left md:sticky md:top-0 md:z-10 md:rounded-tl-xl" />
              {options.map((option) => (
                <th
                  key={option.plan}
                  className={cn(
                    'border-b bg-background p-4 text-left align-top md:sticky md:top-0 md:z-10 last:md:rounded-tr-xl',
                    column(option),
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <ItemTitle className="text-base font-medium">{option.name}</ItemTitle>
                    {onPay && (
                      <Button
                        size="sm"
                        variant={option.plan === 'monthly' ? 'default' : 'outline'}
                        disabled={Boolean(paying)}
                        aria-label={`${t('pay')} ${option.name}`}
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
                  <td colSpan={options.length + 1} className="border-b px-4 pt-8 pb-4">
                    <div className="flex items-start gap-3">
                      <group.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="flex flex-col gap-1">
                        <ItemTitle className="text-base font-semibold">{group.title}</ItemTitle>
                        <ItemDescription className="line-clamp-none">{group.description}</ItemDescription>
                      </div>
                    </div>
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="border-b border-border/40 px-4 py-3.5">
                      <ItemDescription className="line-clamp-none text-foreground">{row.label}</ItemDescription>
                    </td>
                    {options.map((option) => {
                      const value = row.value(option);
                      return (
                        <td key={option.plan} className={cn('border-b border-border/40 px-4 py-3.5', column(option))}>
                          {value ? (
                            <ItemDescription className="line-clamp-none text-foreground">{value}</ItemDescription>
                          ) : (
                            <CheckIcon className="size-5 text-primary" aria-label={t('yes')} />
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
    </div>
  );
}
