import type { ColumnDef } from '@tanstack/react-table';
import { Briefcase, User } from 'lucide-react';
import { TableIdentity, TableStack } from '@/components/data-table.js';
import { identificacaoDaParte } from '@/components/parte-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ParteRecord } from '@/query/parte.js';

export const parteColumns: ColumnDef<ParteRecord, unknown>[] = [
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
    id: 'documento',
    header: t('document'),
    cell: ({ row }) => <TableStack>{identificacaoDaParte(row.original) ?? '—'}</TableStack>,
  },
  {
    id: 'contato',
    header: t('contact'),
    cell: ({ row }) => (
      <TableStack description={row.original.email ? row.original.telefone : undefined}>
        {row.original.email ?? row.original.telefone ?? '—'}
      </TableStack>
    ),
  },
];
