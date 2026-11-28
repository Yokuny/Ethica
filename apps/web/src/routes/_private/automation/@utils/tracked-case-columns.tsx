import type { TrackedCase } from '@ethica/contracts';
import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { TRACKED_CASE_VARIANT, trackedCaseLabel } from '@/components/tracked-case-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

const day = (value?: string) => (value ? formatDate(new Date(value)) : '—');

// The tracked cases (PAT-03). Sortable columns (AD-192): `accessorFn` and the `id` of the server sort
// (`TRACKED_CASE_SORTS`).
export const trackedCaseColumns: ColumnDef<TrackedCase, unknown>[] = [
  {
    id: 'caseLabel',
    accessorFn: (row) => row.caseLabel,
    header: t('process'),
    cell: ({ row }) => <TableIdentity icon={Gavel} title={row.original.caseLabel} />,
  },
  {
    id: 'court',
    header: t('court'),
    cell: ({ row }) => <TableStack width="fit">{row.original.court}</TableStack>,
  },
  {
    id: 'lastMovementAt',
    accessorFn: (row) => row.lastMovementAt,
    header: t('last_movement'),
    cell: ({ row }) =>
      row.original.lastMovementName ? (
        <TableStack width="text" description={day(row.original.lastMovementAt)}>
          {row.original.lastMovementName}
        </TableStack>
      ) : (
        <TableStack width="fit">—</TableStack>
      ),
  },
  {
    id: 'status',
    header: t('situation'),
    cell: ({ row }) => (
      <TableStatus variant={TRACKED_CASE_VARIANT[row.original.status]}>
        {trackedCaseLabel(row.original.status)}
      </TableStatus>
    ),
  },
  {
    id: 'syncedAt',
    accessorFn: (row) => row.syncedAt,
    header: t('last_query'),
    cell: ({ row }) => <TableStack width="fit">{day(row.original.syncedAt)}</TableStack>,
  },
];
