import type { TransactionKind } from '@ethica/contracts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CategoryTotal } from '@/query/transaction.js';

// Total per category of a kind (income or expenses), largest first.
export function CategoriesChart({ kind, data }: { kind: TransactionKind; data: CategoryTotal[] }) {
  const config = {
    totalCents: { label: t('total'), color: kind === 'income' ? 'var(--chart-1)' : 'var(--destructive)' },
  } satisfies ChartConfig;
  const rows = data.map((row) => ({ category: t(row.category), totalCents: row.totalCents }));
  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={140} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel valueFormatter={formatMoney} />} />
        <Bar dataKey="totalCents" fill="var(--color-totalCents)" radius={3} barSize={16} />
      </BarChart>
    </ChartContainer>
  );
}
