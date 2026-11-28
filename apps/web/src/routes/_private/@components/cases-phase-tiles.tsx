import {
  CASE_PHASE_GROUPS,
  type CasePhase,
  type CasePhaseGroup,
  OWN_SERVICE_PHASES,
  TECHNICAL_ASSISTANCE_PHASES,
} from '@ethica/contracts';
import { casePhaseGroupLabel } from '@/components/case-labels.js';
import { HeatTiles } from '@/components/heat-tiles.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Cases by phase group (AD-178), in flow order, plus the technical assistance phases (AD-186) and the ones of
// partnership and private service (AD-310); a group without cases shows as zero.
const PERICIA_PHASES: readonly CasePhase[] = Object.values(CASE_PHASE_GROUPS).flat();
const ASSISTANCE: readonly CasePhase[] = TECHNICAL_ASSISTANCE_PHASES;
export function CasesPhaseTiles({ groups }: { groups: { key: string; count: number }[] }) {
  const counts = new Map(groups.map((group) => [group.key, group.count]));
  const sum = (phases: readonly string[]) => phases.reduce((total, phase) => total + (counts.get(phase) ?? 0), 0);
  const items = [
    ...(Object.keys(CASE_PHASE_GROUPS) as CasePhaseGroup[]).map((group) => ({
      key: group,
      label: casePhaseGroupLabel(group),
      count: sum(CASE_PHASE_GROUPS[group]),
    })),
    // The assistance list (AD-186) and the one of partnership and private service (AD-310), without the phases
    // already in the groups above.
    {
      key: 'technical_assistance',
      label: t('technical_assistance'),
      count: sum(TECHNICAL_ASSISTANCE_PHASES.filter((phase) => !PERICIA_PHASES.includes(phase))),
    },
    {
      key: 'own_service',
      label: `${t('partnership')} · ${t('private_service')}`,
      count: sum(OWN_SERVICE_PHASES.filter((phase) => !PERICIA_PHASES.includes(phase) && !ASSISTANCE.includes(phase))),
    },
  ];
  return <HeatTiles items={items} />;
}
