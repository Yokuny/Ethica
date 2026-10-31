import { JUSTICAS } from '@ethica/contracts';
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
export function PericiasJusticaChart({ groups }: { groups: { key: string; count: number }[] }) {
  const counts = new Map(groups.map((group) => [group.key, group.count]));
  const data = JUSTICAS.map((justica) => ({ justica, count: counts.get(justica) ?? 0 })).filter((row) => row.count);
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="justica" hideLabel />} />
        <Pie data={data} dataKey="count" nameKey="justica" innerRadius={56} strokeWidth={2}>
          {data.map((row) => (
            <Cell key={row.justica} fill={`var(--color-${row.justica})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
