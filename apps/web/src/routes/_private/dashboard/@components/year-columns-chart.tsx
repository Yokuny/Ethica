import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';

type YearColumnsChartProps = {
  data: { year: string; value: number }[];
  label: string;
  // Exact value in the tooltip; `columnLabel` is the short one above the column.
  format: (value: number) => string;
  columnLabel: (value: number) => string;
};

// One series, one column per year: the panel title names it and each column carries its value.
export function YearColumnsChart({ data, label, format, columnLabel }: YearColumnsChartProps) {
  const config = { value: { label, color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 24 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={format} />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={56}>
          <LabelList
            dataKey="value"
            position="top"
            className="fill-foreground"
            formatter={(value) => columnLabel(Number(value))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
