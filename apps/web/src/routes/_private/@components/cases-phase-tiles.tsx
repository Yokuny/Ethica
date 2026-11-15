import { CASE_PHASE_GROUPS, type CasePhaseGroup, TECHNICAL_ASSISTANCE_PHASES } from '@ethica/contracts';
import { casePhaseGroupLabel, casePhaseLabel } from '@/components/case-labels.js';
import { HeatTiles } from '@/components/heat-tiles.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Cases by phase group (AD-178), in flow order, plus the technical assistance phases (AD-186) and the phases
// typed in own types; a group without cases shows as zero.
export function CasesPhaseTiles({ groups }: { groups: { key: string; count: number }[] }) {
  const counts = new Map(groups.map((group) => [group.key, group.count]));
  const sum = (phases: readonly string[]) => phases.reduce((total, phase) => total + (counts.get(phase) ?? 0), 0);
  const items = [
    ...(Object.keys(CASE_PHASE_GROUPS) as CasePhaseGroup[]).map((group) => ({
      key: group,
      label: casePhaseGroupLabel(group),
      count: sum(CASE_PHASE_GROUPS[group]),
    })),
    // The assistance list (AD-186); "Honorários recebidos" is already in the receiving group.
    {
      key: 'technical_assistance',
      label: t('technical_assistance'),
      count: sum(TECHNICAL_ASSISTANCE_PHASES.filter((phase) => phase !== 'fees_received')),
    },
    { key: 'custom', label: casePhaseLabel('custom'), count: sum(['custom']) },
  ];
  return <HeatTiles items={items} />;
}
