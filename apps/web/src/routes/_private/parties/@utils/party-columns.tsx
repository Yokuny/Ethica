import type { ColumnDef } from '@tanstack/react-table';
import { Briefcase, User } from 'lucide-react';
import { TableIdentity, TableStack } from '@/components/data-table.js';
import { partyIdentification } from '@/components/party-labels.js';
import type { TableExportColumn } from '@/lib/helpers/tableExport.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PartyRecord } from '@/query/party.js';

export const partyColumns: ColumnDef<PartyRecord, unknown>[] = [
  {
    // Sortable (AD-192): `accessorFn` and the `id` of the server sort (`PARTY_LIST_SORTS`).
    id: 'name',
    accessorFn: (row) => row.name,
    header: t('name'),
    cell: ({ row }) => (
      <TableIdentity
        icon={row.original.type === 'lawyer' ? Briefcase : User}
        title={row.original.name}
        description={t(row.original.type)}
      />
    ),
  },
  {
    id: 'document',
    header: t('registration'),
    cell: ({ row }) => <TableStack>{partyIdentification(row.original) ?? '—'}</TableStack>,
  },
  {
    id: 'contato',
    header: t('contact'),
    cell: ({ row }) => (
      <TableStack description={row.original.email ? row.original.phone : undefined}>
        {row.original.email ?? row.original.phone ?? '—'}
      </TableStack>
    ),
  },
];

// Columns of the exported file (CSV, Excel, PDF): the table with e-mail and phone in columns of their own.
export const partyExportColumns: TableExportColumn<PartyRecord>[] = [
  { header: t('name'), value: (row) => row.name },
  { header: t('type'), value: (row) => t(row.type) },
  { header: t('registration'), value: (row) => partyIdentification(row) },
  { header: t('email'), value: (row) => row.email },
  { header: t('phone'), value: (row) => row.phone },
];
