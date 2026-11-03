import { caseLabel, type Side } from '@ethica/contracts';
import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import { CASE_STATUS_VARIANT, caseStatusLabel, serviceTypeLabel } from '@/components/case-labels.js';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { deadlineAlert } from '@/components/deadline-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseListItem } from '@/query/case.js';

const toDate = (day: string) => new Date(`${day}T12:00:00`);
// Names of the parties (not the lawyers) of one side, for the "Partes" column.
const names = (row: CaseListItem, side: Side) =>
  row.parties
    .filter((party) => party.side === side && party.type === 'party')
    .map((party) => party.name)
    .join(', ');

// The server does not accept sort: no column is sortable.
export const caseColumns: ColumnDef<CaseListItem, unknown>[] = [
  {
    id: 'process',
    header: t('process'),
    cell: ({ row }) => (
      <TableIdentity
        icon={Gavel}
        title={caseLabel(row.original)}
        description={row.original.processNumber ? row.original.subject : undefined}
      />
    ),
  },
  {
    // Plaintiff on the first line, defendant below.
    id: 'parties',
    header: t('parties'),
    cell: ({ row }) => (
      <TableStack description={names(row.original, 'defendant') || undefined}>
        {names(row.original, 'plaintiff') || '—'}
      </TableStack>
    ),
  },
  {
    id: 'service',
    header: t('service_type'),
    cell: ({ row }) => serviceTypeLabel(row.original),
  },
  {
    id: 'juizo',
    header: t('court_header'),
    cell: ({ row }) => (
      <TableStack description={[row.original.division, row.original.district].filter(Boolean).join(' · ') || undefined}>
        {row.original.court ?? '—'}
      </TableStack>
    ),
  },
  {
    id: 'status',
    header: t('status'),
    cell: ({ row }) => (
      <TableStatus variant={CASE_STATUS_VARIANT[row.original.status]}>
        {caseStatusLabel(row.original.status)}
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
      // In a technical assistant case the set amount is the contracted one (AD-135).
      const definido = role === 'technical_assistant' ? t('contracted') : t('fixed');
      return (
        <TableStack description={fixedFeesCents ? definido : value ? t('proposed') : undefined}>
          {value ? formatMoney(value) : '—'}
        </TableStack>
      );
    },
  },
];
