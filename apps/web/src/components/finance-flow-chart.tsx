import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@ethica/ui/components/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { MonthlyFlow } from '@/query/transaction.js';

const config = {
  receivedCents: { label: t('received'), color: 'var(--chart-1)' },
  receivableCents: { label: t('receivable'), color: 'var(--chart-4)' },
  expensesCents: { label: t('expenses'), color: 'var(--destructive)' },
} satisfies ChartConfig;

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const formatMonth = (month: string) => monthLabel.format(new Date(`${month}-15T12:00:00Z`));
const compactMoney = new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' });

// Cash flow per month: received, receivable and expenses, side by side.
// Whoever fetches the data decides loading/empty; here it arrives ready.
export function FinanceFlowChart({ data }: { data: MonthlyFlow[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatMonth} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => compactMoney.format(value / 100)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent labelFormatter={(label) => formatMonth(String(label))} valueFormatter={formatMoney} />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="receivedCents" fill="var(--color-recebidoCents)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="receivableCents" fill="var(--color-aReceberCents)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expensesCents" fill="var(--color-despesasCents)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
