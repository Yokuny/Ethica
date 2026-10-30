import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TableIdentity, TableRowAction, TableRowActions, TableStack, TableStatus } from '@/components/data-table.js';
import { SITUACAO_VARIANT, situacaoDoLancamento } from '@/components/lancamento-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LancamentoRecord } from '@/query/lancamento.js';

type Actions = { onStatus: (lancamento: LancamentoRecord, status: 'liquidado' | 'cancelado' | 'previsto') => void };

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

export const lancamentoColumns = ({ onStatus }: Actions): ColumnDef<LancamentoRecord, unknown>[] => {
  const today = formatDisplayDate(new Date());
  return [
    {
      id: 'descricao',
      header: t('entry'),
      cell: ({ row }) => (
        <TableIdentity
          icon={row.original.natureza === 'receita' ? ArrowDownLeft : ArrowUpRight}
          title={row.original.descricao}
          description={[t(row.original.categoria), row.original.periciaNumero].filter(Boolean).join(' · ')}
          link={
            row.original.periciaId ? { to: '/pericias/details', search: { id: row.original.periciaId } } : undefined
          }
        />
      ),
    },
    {
      id: 'valor',
      header: t('amount'),
      cell: ({ row }) => (
        <TableStack
          tone={row.original.natureza === 'despesa' ? 'error' : 'default'}
          description={t(row.original.natureza)}
        >
          {`${row.original.natureza === 'despesa' ? '−' : ''}${formatMoney(row.original.valorCents)}`}
        </TableStack>
      ),
    },
    {
      id: 'vencimento',
      header: t('due_date'),
      cell: ({ row }) => (
        <TableStack
          tone="muted"
          description={row.original.liquidadoEm ? `${t('settled_on')} ${day(row.original.liquidadoEm)}` : undefined}
        >
          {day(row.original.vencimento)}
        </TableStack>
      ),
    },
    {
      id: 'situacao',
      header: t('status'),
      cell: ({ row }) => {
        const situacao = situacaoDoLancamento(row.original, today);
        return <TableStatus variant={SITUACAO_VARIANT[situacao]}>{t(situacao)}</TableStatus>;
      },
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <TableRowActions label={t('actions')}>
          {row.original.status !== 'liquidado' && (
            <TableRowAction onClick={() => onStatus(row.original, 'liquidado')}>
              {t(row.original.natureza === 'receita' ? 'mark_as_received' : 'mark_as_paid')}
            </TableRowAction>
          )}
          {row.original.status !== 'previsto' && (
            <TableRowAction onClick={() => onStatus(row.original, 'previsto')}>{t('reopen')}</TableRowAction>
          )}
          {row.original.status !== 'cancelado' && (
            <TableRowAction variant="destructive" onClick={() => onStatus(row.original, 'cancelado')}>
              {t('cancel_entry')}
            </TableRowAction>
          )}
        </TableRowActions>
      ),
    },
  ];
};
