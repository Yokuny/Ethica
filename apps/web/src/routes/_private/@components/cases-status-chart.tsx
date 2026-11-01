import { CASE_STATUS } from '@ethica/contracts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { t } from '@/lib/helpers/translate.helper.js';

const config = { count: { label: t('expert_cases'), color: 'var(--chart-1)' } } satisfies ChartConfig;

// Perícias por etapa, na ordem do fluxo (etapa sem perícia aparece zerada).
export function CasesStatusChart({ groups }: { groups: { key: string; count: number }[] }) {
  const counts = new Map(groups.map((group) => [group.key, group.count]));
  const data = CASE_STATUS.map((status) => ({ status: t(status), count: counts.get(status) ?? 0 }));
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis dataKey="status" type="category" tickLine={false} axisLine={false} width={120} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={3} barSize={14} />
      </BarChart>
    </ChartContainer>
  );
}
