import type { ColumnDef } from '@tanstack/react-table';
import { Briefcase, User } from 'lucide-react';
import { TableIdentity, TableStack } from '@/components/data-table.js';
import { partyIdentification } from '@/components/party-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PartyRecord } from '@/query/party.js';

export const partyColumns: ColumnDef<PartyRecord, unknown>[] = [
  {
    id: 'nome',
    header: t('name'),
    cell: ({ row }) => (
      <TableIdentity
        icon={row.original.tipo === 'lawyer' ? Briefcase : User}
        title={row.original.nome}
        description={t(row.original.tipo)}
      />
    ),
  },
  {
    id: 'document',
    header: t('document'),
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
