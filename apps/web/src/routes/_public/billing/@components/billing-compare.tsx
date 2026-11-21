import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { CheckIcon } from 'lucide-react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CORE_FEATURES, type PlanOption } from '../@consts/plans.js';

// The plans side by side: what changes between them, then what all of them have.
export function BillingCompare({ options }: { options: PlanOption[] }) {
  const rows: { label: string; value: (option: PlanOption) => string }[] = [
    { label: t('payment'), value: (option) => option.method },
    { label: t('billing_renewal'), value: (option) => option.renewal },
    { label: t('billing_price_per_month'), value: (option) => formatMoney(option.perMonthCents) },
    { label: t('billing_team'), value: (option) => option.team },
  ];

  return (
    <section className="flex flex-col gap-4">
      <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
        render={<h3 />}
        className="mx-auto justify-center text-2xl font-medium tracking-tight"
      >
        {t('billing_compare_title')}
      </ItemTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead />
            {options.map((option) => (
              <TableHead key={option.plan}>{option.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="py-3">
                <ItemTitle>{row.label}</ItemTitle>
              </TableCell>
              {options.map((option) => (
                <TableCell key={option.plan} className="py-3">
                  <ItemDescription className="line-clamp-none min-w-24 whitespace-normal text-foreground">
                    {row.value(option)}
                  </ItemDescription>
                </TableCell>
              ))}
            </TableRow>
          ))}
          {CORE_FEATURES.map((feature) => (
            <TableRow key={feature}>
              <TableCell className="py-3 whitespace-normal">
                <ItemTitle className="min-w-40">{feature}</ItemTitle>
              </TableCell>
              {options.map((option) => (
                <TableCell key={option.plan} className="py-3">
                  <CheckIcon className="size-4 text-status-success-indicator" aria-label={t('yes')} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
