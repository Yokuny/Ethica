import { COURTTYPES } from '@ethica/contracts';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@ethica/ui/components/chart';
import { Cell, Pie, PieChart } from 'recharts';
import { t } from '@/lib/helpers/translate.helper.js';

const config = {
  labor: { label: t('labor_court'), color: 'var(--chart-1)' },
  civil: { label: t('civil_court'), color: 'var(--chart-3)' },
  federal: { label: t('federal_court'), color: 'var(--chart-5)' },
} satisfies ChartConfig;

// Distribuição das perícias por justiça (trabalhista, cível, federal).
export function CasesCourtTypeChart({ groups }: { groups: { key: string; count: number }[] }) {
  const counts = new Map(groups.map((group) => [group.key, group.count]));
  const data = COURTTYPES.map((courtType) => ({ courtType, count: counts.get(courtType) ?? 0 })).filter(
    (row) => row.count,
  );
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="courtType" hideLabel />} />
        <Pie data={data} dataKey="count" nameKey="courtType" innerRadius={56} strokeWidth={2}>
          {data.map((row) => (
            <Cell key={row.courtType} fill={`var(--color-${row.courtType})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
