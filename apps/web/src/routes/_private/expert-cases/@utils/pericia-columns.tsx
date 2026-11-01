import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import {
  faseLabel,
  justicaLabel,
  PERICIA_SITUACAO_VARIANT,
  PERICIA_STATUS_VARIANT,
} from '@/components/pericia-labels.js';
import { alertaDoPrazo } from '@/components/prazo-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiaListItem } from '@/query/pericia.js';

const toDate = (day: string) => new Date(`${day}T12:00:00`);

// O servidor não aceita sort: nenhuma coluna é ordenável.
export const periciaColumns: ColumnDef<PericiaListItem, unknown>[] = [
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
      // Suspensa aparece no lugar da etapa: é o que pede atenção (AD-133).
      <TableStack description={row.original.fase ? faseLabel(row.original.fase) : undefined}>
        {row.original.situacao === 'suspended' ? (
          <TableStatus variant={PERICIA_SITUACAO_VARIANT.suspended}>{t('situation_suspended')}</TableStatus>
        ) : (
          <TableStatus variant={PERICIA_STATUS_VARIANT[row.original.status]}>{t(row.original.status)}</TableStatus>
        )}
      </TableStack>
    ),
  },
  {
    id: 'proximoPrazo',
    header: t('next_deadline'),
    cell: ({ row }) => {
      const prazo = row.original.proximoPrazo;
      if (!prazo) return <TableStack tone="muted">—</TableStack>;
      const alerta = alertaDoPrazo(prazo, formatDisplayDate(new Date()));
      return (
        <TableStack
          tone={alerta === 'deadline_overdue' ? 'error' : 'default'}
          description={alerta ? `${t(alerta)} · ${prazo.titulo}` : prazo.titulo}
          descriptionTone={alerta === 'deadline_overdue' ? 'error' : 'muted'}
        >
          {formatDate(toDate(prazo.vencimento))}
        </TableStack>
      );
    },
  },
  {
    id: 'honorarios',
    header: t('fees'),
    cell: ({ row }) => {
      const { honorariosFixadosCents, honorariosPropostosCents, papel } = row.original;
      const value = honorariosFixadosCents ?? honorariosPropostosCents;
      // Na perícia de assistente técnico o valor definido é o contratado (AD-135).
      const definido = papel === 'technical_assistant' ? t('contracted') : t('fixed');
      return (
        <TableStack description={honorariosFixadosCents ? definido : value ? t('proposed') : undefined}>
          {value ? formatMoney(value) : '—'}
        </TableStack>
      );
    },
  },
];
