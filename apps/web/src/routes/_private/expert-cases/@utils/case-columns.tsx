import { caseLabel, isOwnType, type Side, usesContractor } from '@ethica/contracts';
import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import { CASE_STATUS_VARIANT, casePhaseLabel, caseStatusLabel, serviceLabel } from '@/components/case-labels.js';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { deadlineAlert } from '@/components/deadline-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseListItem } from '@/query/case.js';

const toDate = (day: string) => new Date(`${day}T12:00:00`);
// Names of the parties (not the lawyers) of one side, for the "Contratante" column of a perícia.
const names = (row: CaseListItem, side: Side) =>
  row.parties
    .filter((party) => party.side === side && party.type === 'party')
    .map((party) => party.name)
    .join(', ');

// Long-text columns share one width, so the wrapped lines of a row end even (Contratante, Cliente | Comarca).
const TEXT_COLUMN = 'min-w-48 max-w-60';

// The server does not accept sort: no column is sortable.
export const caseColumns: ColumnDef<CaseListItem, unknown>[] = [
  {
    // Service order control number (OS) given by the office.
    id: 'serviceOrder',
    header: t('control'),
    cell: ({ row }) => (
      <TableStack tone={row.original.serviceOrder ? 'default' : 'muted'}>{row.original.serviceOrder ?? '—'}</TableStack>
    ),
  },
  {
    id: 'service',
    header: t('expert_case'),
    cell: ({ row }) => (
      <TableIdentity
        icon={Gavel}
        title={caseLabel(row.original)}
        description={row.original.processNumber ? row.original.subject : undefined}
      />
    ),
  },
  {
    // Perícia: plaintiff on the first line, defendant below; the other types: whoever hired it (AD-176).
    id: 'contractor',
    header: t('contracting_party'),
    cell: ({ row }) =>
      usesContractor(row.original) ? (
        <TableStack className={TEXT_COLUMN}>{row.original.contractor?.name ?? '—'}</TableStack>
      ) : (
        <TableStack className={TEXT_COLUMN} description={names(row.original, 'defendant') || undefined}>
          {names(row.original, 'plaintiff') || '—'}
        </TableStack>
      ),
  },
  {
    id: 'serviceType',
    header: t('service_type'),
    cell: ({ row }) => serviceLabel(row.original),
  },
  {
    // Perícia: court and division; the other types: who hired it (AD-176).
    id: 'clientDistrict',
    header: t('client_district'),
    cell: ({ row }) =>
      usesContractor(row.original) ? (
        <TableStack className={TEXT_COLUMN}>{row.original.contractor?.name ?? '—'}</TableStack>
      ) : (
        <TableStack className={TEXT_COLUMN} description={row.original.division || row.original.district || undefined}>
          {row.original.court ?? '—'}
        </TableStack>
      ),
  },
  {
    id: 'phase',
    header: t('service_phase'),
    // Phase in the tone of the status (AD-178); a status other than active is named after it.
    cell: ({ row }) => (
      <TableStatus
        variant={CASE_STATUS_VARIANT[row.original.status]}
        className="h-auto max-w-60 whitespace-normal text-left"
      >
        {[
          casePhaseLabel(row.original.phase, row.original.phaseName),
          row.original.status !== 'active' && caseStatusLabel(row.original.status),
        ]
          .filter(Boolean)
          .join(' · ')}
      </TableStatus>
    ),
  },
  {
    id: 'nextDeadline',
    header: t('next_deadline'),
    cell: ({ row }) => {
      const deadline = row.original.nextDeadline;
      if (!deadline) return <TableStack tone="muted">—</TableStack>;
      const alert = deadlineAlert(deadline, formatDisplayDate(new Date()));
      return (
        <TableStack
          tone={alert === 'deadline_overdue' ? 'error' : 'default'}
          description={alert ? `${t(alert)} · ${deadline.title}` : deadline.title}
          descriptionTone={alert === 'deadline_overdue' ? 'error' : 'muted'}
        >
          {formatDate(toDate(deadline.dueDate))}
        </TableStack>
      );
    },
  },
  {
    id: 'fees',
    header: t('fees'),
    cell: ({ row }) => {
      const { fixedFeesCents, proposedFeesCents, role } = row.original;
      const value = fixedFeesCents ?? proposedFeesCents;
      // In a technical assistant case (AD-135) and in the office's own type (AD-176) it is the contracted one.
      const definido = role === 'technical_assistant' || isOwnType(row.original) ? t('contracted') : t('fixed');
      return (
        <TableStack description={fixedFeesCents ? definido : value ? t('proposed') : undefined}>
          {value ? formatMoney(value) : '—'}
        </TableStack>
      );
    },
  },
];
