import { CASE_PHASE_GROUPS, type CasePhaseGroup } from '@ethica/contracts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { casePhaseGroupLabel, casePhaseLabel } from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';

const config = { count: { label: t('expert_cases'), color: 'var(--chart-1)' } } satisfies ChartConfig;

// Cases by phase group (AD-178), in flow order, plus the phases typed in own types; a group without cases
// shows as zero.
export function CasesPhaseChart({ groups }: { groups: { key: string; count: number }[] }) {
  const counts = new Map(groups.map((group) => [group.key, group.count]));
  const sum = (phases: readonly string[]) => phases.reduce((total, phase) => total + (counts.get(phase) ?? 0), 0);
  const data = [
    ...(Object.keys(CASE_PHASE_GROUPS) as CasePhaseGroup[]).map((group) => ({
      phase: casePhaseGroupLabel(group),
      count: sum(CASE_PHASE_GROUPS[group]),
    })),
    { phase: casePhaseLabel('custom'), count: sum(['custom']) },
  ];
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis dataKey="phase" type="category" tickLine={false} axisLine={false} width={160} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={3} barSize={14} />
      </BarChart>
    </ChartContainer>
  );
}
