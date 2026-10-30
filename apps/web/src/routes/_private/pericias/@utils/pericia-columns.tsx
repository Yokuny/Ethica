import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { justicaLabel, PERICIA_STATUS_VARIANT } from '@/components/pericia-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiaRecord } from '@/query/pericia.js';

const toDate = (day: string) => new Date(`${day}T12:00:00`);

// O servidor não aceita sort: nenhuma coluna é ordenável.
export const periciaColumns: ColumnDef<PericiaRecord, unknown>[] = [
  {
    id: 'processo',
    header: t('process'),
    cell: ({ row }) => (
      <TableIdentity icon={Gavel} title={row.original.numeroProcesso} description={row.original.objeto} />
    ),
  },
  {
    id: 'juizo',
    header: t('court'),
    cell: ({ row }) => (
      <TableStack description={[row.original.vara, row.original.comarca].filter(Boolean).join(' · ') || undefined}>
        {`${row.original.tribunal} · ${justicaLabel(row.original.justica)}`}
      </TableStack>
    ),
  },
  {
    id: 'status',
    header: t('stage'),
    cell: ({ row }) => (
      <TableStatus variant={PERICIA_STATUS_VARIANT[row.original.status]}>{t(row.original.status)}</TableStatus>
    ),
  },
  {
    id: 'prazoLaudo',
    header: t('report_deadline'),
    cell: ({ row }) => {
      const prazo = row.original.prazoLaudo;
      if (!prazo) return <TableStack tone="muted">—</TableStack>;
      return (
        <TableStack tone={prazo < formatDisplayDate(new Date()) ? 'error' : 'default'}>
          {formatDate(toDate(prazo))}
        </TableStack>
      );
    },
  },
  {
    id: 'honorarios',
    header: t('fees'),
    cell: ({ row }) => {
      const { honorariosFixadosCents, honorariosPropostosCents } = row.original;
      const value = honorariosFixadosCents ?? honorariosPropostosCents;
      return (
        <TableStack description={honorariosFixadosCents ? t('fixed') : value ? t('proposed') : undefined}>
          {value ? formatMoney(value) : '—'}
        </TableStack>
      );
    },
  },
];
