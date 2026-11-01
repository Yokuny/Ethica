import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import { CASE_STATE_VARIANT, CASE_STATUS_VARIANT, courtTypeLabel, phaseLabel } from '@/components/case-labels.js';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { deadlineAlert } from '@/components/deadline-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseListItem } from '@/query/case.js';

const toDate = (day: string) => new Date(`${day}T12:00:00`);

// O servidor não aceita sort: nenhuma coluna é ordenável.
export const caseColumns: ColumnDef<CaseListItem, unknown>[] = [
  {
    id: 'process',
    header: t('process'),
    cell: ({ row }) => (
      <TableIdentity icon={Gavel} title={row.original.processNumber} description={row.original.subject} />
    ),
  },
  {
    id: 'juizo',
    header: t('court_header'),
    cell: ({ row }) => (
      <TableStack description={[row.original.division, row.original.district].filter(Boolean).join(' · ') || undefined}>
        {`${row.original.court} · ${courtTypeLabel(row.original.courtType)}`}
      </TableStack>
    ),
  },
  {
    id: 'status',
    header: t('stage'),
    cell: ({ row }) => (
      // Suspensa aparece no lugar da etapa: é o que pede atenção (AD-133).
      <TableStack description={row.original.phase ? phaseLabel(row.original.phase) : undefined}>
        {row.original.state === 'suspended' ? (
          <TableStatus variant={CASE_STATE_VARIANT.suspended}>{t('situation_suspended')}</TableStatus>
        ) : (
          <TableStatus variant={CASE_STATUS_VARIANT[row.original.status]}>{t(row.original.status)}</TableStatus>
        )}
      </TableStack>
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
      // Na perícia de assistente técnico o valor definido é o contratado (AD-135).
      const definido = role === 'technical_assistant' ? t('contracted') : t('fixed');
      return (
        <TableStack description={fixedFeesCents ? definido : value ? t('proposed') : undefined}>
          {value ? formatMoney(value) : '—'}
        </TableStack>
      );
    },
  },
];
