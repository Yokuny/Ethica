import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TableIdentity, TableRowAction, TableRowActions, TableStack, TableStatus } from '@/components/data-table.js';
import { SITUACAO_VARIANT, situacaoDoLancamento } from '@/components/lancamento-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LancamentoRecord } from '@/query/lancamento.js';

type Actions = {
  // Só despesa: liquidar, reabrir e cancelar à mão. Honorário recebe parcelas (AD-111).
  onStatus: (lancamento: LancamentoRecord, status: 'settled' | 'canceled' | 'expected') => void;
  onReceber: (lancamento: LancamentoRecord) => void;
};

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

export const lancamentoColumns = ({ onStatus, onReceber }: Actions): ColumnDef<LancamentoRecord, unknown>[] => {
  const today = formatDisplayDate(new Date());
  return [
    {
      id: 'descricao',
      header: t('entry'),
      cell: ({ row }) => (
        <TableIdentity
          icon={row.original.natureza === 'income' ? ArrowDownLeft : ArrowUpRight}
          title={row.original.descricao}
          description={[t(row.original.categoria), row.original.periciaNumero, row.original.contratante]
            .filter(Boolean)
            .join(' · ')}
          link={
            row.original.periciaId ? { to: '/expert-cases/details', search: { id: row.original.periciaId } } : undefined
          }
        />
      ),
    },
    {
      id: 'valor',
      header: t('amount'),
      cell: ({ row }) => (
        <TableStack
          tone={row.original.natureza === 'expense' ? 'error' : 'default'}
          description={
            row.original.status === 'partial'
              ? `${t('received')} ${formatMoney(row.original.recebidoCents ?? 0)} · ${t('balance_due')} ${formatMoney(row.original.saldoCents ?? 0)}`
              : t(row.original.natureza)
          }
        >
          {`${row.original.natureza === 'expense' ? '−' : ''}${formatMoney(row.original.valorCents)}`}
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
      cell: ({ row }) =>
        row.original.natureza === 'income' ? (
          row.original.status !== 'settled' && (
            <TableRowActions label={t('actions')}>
              <TableRowAction onClick={() => onReceber(row.original)}>{t('register_receipt')}</TableRowAction>
            </TableRowActions>
          )
        ) : (
          <TableRowActions label={t('actions')}>
            {row.original.status !== 'settled' && (
              <TableRowAction onClick={() => onStatus(row.original, 'settled')}>{t('mark_as_paid')}</TableRowAction>
            )}
            {row.original.status !== 'expected' && (
              <TableRowAction onClick={() => onStatus(row.original, 'expected')}>{t('reopen')}</TableRowAction>
            )}
            {row.original.status !== 'canceled' && (
              <TableRowAction variant="destructive" onClick={() => onStatus(row.original, 'canceled')}>
                {t('cancel_entry')}
              </TableRowAction>
            )}
          </TableRowActions>
        ),
    },
  ];
};
