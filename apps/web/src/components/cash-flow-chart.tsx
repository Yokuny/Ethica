import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { MonthlyFlow } from '@/query/transaction.js';

// Indicative colors, the same on every panel (AD-255): green is money in, red is money out, purple is expected.
export const MONEY_COLORS = {
  received: 'var(--status-success-indicator)',
  expenses: 'var(--status-error-indicator)',
  receivable: 'color-mix(in oklab, var(--chart-5) 55%, var(--foreground))',
};

const config = {
  receivedCents: { label: t('received'), color: MONEY_COLORS.received },
  expensesCents: { label: t('expenses'), color: MONEY_COLORS.expenses },
  receivableCents: { label: t('receivable_expected'), color: MONEY_COLORS.receivable },
} satisfies ChartConfig;

const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const asDate = (month: string) => new Date(`${month}-15T12:00:00Z`);
const compactMoney = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 1,
});

// Cash flow over time (AD-255): received as a green area, expenses as a red line and the receivable by due month
// as a dashed purple line. The axis starts at zero, and the legend above writes each series' sum in the period.
export function CashFlowChart({ data }: { data: MonthlyFlow[] }) {
  const sums = (Object.keys(config) as (keyof typeof config)[]).map((key) => ({
    key,
    label: config[key].label,
    color: config[key].color,
    dashed: key === 'receivableCents',
    total: data.reduce((sum, row) => sum + row[key], 0),
  }));
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-8 gap-y-3">
        {sums.map((item) => (
          <li key={item.key} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={
                  item.dashed
                    ? {
                        backgroundImage: `linear-gradient(90deg, ${item.color} 50%, transparent 50%)`,
                        backgroundSize: '6px 2px',
                      }
                    : { backgroundColor: item.color }
                }
              />
              <ItemDescription className="text-xs">{item.label}</ItemDescription>
            </div>
            <ItemTitle className="font-medium tabular-nums">{formatMoney(item.total)}</ItemTitle>
          </li>
        ))}
      </ul>
      <ChartContainer
        config={config}
        className="aspect-auto h-64 w-full"
        role="img"
        aria-label={`${t('cash_flow')}: ${sums.map((item) => `${item.label} ${formatMoney(item.total)}`).join(', ')}`}
      >
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(month: string) => monthShort.format(asDate(month)).replace('.', '')}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
            tickFormatter={(cents: number) => compactMoney.format(cents / 100)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(month) => monthLong.format(asDate(String(month)))}
                valueFormatter={formatMoney}
              />
            }
          />
          <Area
            dataKey="receivedCents"
            type="monotone"
            stroke="var(--color-receivedCents)"
            strokeWidth={2}
            fill="var(--color-receivedCents)"
            fillOpacity={0.15}
            isAnimationActive={false}
          />
          <Line
            dataKey="expensesCents"
            type="monotone"
            stroke="var(--color-expensesCents)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="receivableCents"
            type="monotone"
            stroke="var(--color-receivableCents)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
