import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TableIdentity, TableRowAction, TableRowActions, TableStack, TableStatus } from '@/components/data-table.js';
import { STATE_VARIANT, transactionState } from '@/components/transaction-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord } from '@/query/transaction.js';

type Actions = {
  // Só despesa: liquidar, reabrir e cancelar à mão. Honorário recebe parcelas (AD-111).
  onStatus: (transaction: TransactionRecord, status: 'settled' | 'canceled' | 'expected') => void;
  onReceive: (transaction: TransactionRecord) => void;
};

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

export const transactionColumns = ({ onStatus, onReceive }: Actions): ColumnDef<TransactionRecord, unknown>[] => {
  const today = formatDisplayDate(new Date());
  return [
    {
      id: 'descricao',
      header: t('entry'),
      cell: ({ row }) => (
        <TableIdentity
          icon={row.original.kind === 'income' ? ArrowDownLeft : ArrowUpRight}
          title={row.original.descricao}
          description={[t(row.original.category), row.original.caseNumber, row.original.client]
            .filter(Boolean)
            .join(' · ')}
          link={row.original.caseId ? { to: '/expert-cases/details', search: { id: row.original.caseId } } : undefined}
        />
      ),
    },
    {
      id: 'amount',
      header: t('amount'),
      cell: ({ row }) => (
        <TableStack
          tone={row.original.kind === 'expense' ? 'error' : 'default'}
          description={
            row.original.status === 'partial'
              ? `${t('received')} ${formatMoney(row.original.receivedCents ?? 0)} · ${t('balance_due')} ${formatMoney(row.original.balanceCents ?? 0)}`
              : t(row.original.kind)
          }
        >
          {`${row.original.kind === 'expense' ? '−' : ''}${formatMoney(row.original.amountCents)}`}
        </TableStack>
      ),
    },
    {
      id: 'dueDate',
      header: t('due_date'),
      cell: ({ row }) => (
        <TableStack
          tone="muted"
          description={row.original.settledDate ? `${t('settled_on')} ${day(row.original.settledDate)}` : undefined}
        >
          {day(row.original.dueDate)}
        </TableStack>
      ),
    },
    {
      id: 'state',
      header: t('status'),
      cell: ({ row }) => {
        const state = transactionState(row.original, today);
        return <TableStatus variant={STATE_VARIANT[state]}>{t(state)}</TableStatus>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.kind === 'income' ? (
          row.original.status !== 'settled' && (
            <TableRowActions label={t('actions')}>
              <TableRowAction onClick={() => onReceive(row.original)}>{t('register_receipt')}</TableRowAction>
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
