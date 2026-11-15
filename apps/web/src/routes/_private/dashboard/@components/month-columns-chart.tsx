import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';

type MonthColumnsChartProps = {
  data: { month: string; count: number }[];
  label: string;
};

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const formatMonth = (month: string) => monthLabel.format(new Date(`${month}-15T12:00:00Z`));
const number = new Intl.NumberFormat('pt-BR');

// One series, one column per month: the panel title names it and each column carries its count.
export function MonthColumnsChart({ data, label }: MonthColumnsChartProps) {
  const config = { count: { label, color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 24 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatMonth} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(month) => formatMonth(String(month))} />}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={56}>
          <LabelList
            dataKey="count"
            position="top"
            className="fill-foreground"
            formatter={(value) => (Number(value) ? number.format(Number(value)) : '')}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
