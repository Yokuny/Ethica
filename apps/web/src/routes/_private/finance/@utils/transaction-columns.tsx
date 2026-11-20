import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TableIdentity, TableRowAction, TableRowActions, TableStack, TableStatus } from '@/components/data-table.js';
import { categoryLabel, STATE_VARIANT, stateLabel, transactionState } from '@/components/transaction-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import type { TableExportColumn } from '@/lib/helpers/tableExport.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord } from '@/query/transaction.js';

type Actions = {
  // Annul and reactivate (AD-200); an expense also settles and reopens by hand, a fee gets installments (AD-111).
  onStatus: (transaction: TransactionRecord, status: 'canceled' | 'expected') => void;
  onReceive: (transaction: TransactionRecord) => void;
  onPay: (transaction: TransactionRecord) => void;
};

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Sortable columns (AD-192) have an `accessorFn` and the `id` of the server sort (`TRANSACTION_LIST_SORTS`).
export const transactionColumns = ({
  onStatus,
  onReceive,
  onPay,
}: Actions): ColumnDef<TransactionRecord, unknown>[] => {
  const today = formatDisplayDate(new Date());
  return [
    {
      id: 'description',
      accessorFn: (row) => row.description,
      header: t('entry'),
      cell: ({ row }) => (
        <TableIdentity
          icon={row.original.kind === 'income' ? ArrowUpRight : ArrowDownLeft}
          iconTone={row.original.kind === 'income' ? 'success' : 'error'}
          title={row.original.description}
          description={[categoryLabel(row.original), row.original.caseNumber, row.original.client]
            .filter(Boolean)
            .join(' · ')}
          link={row.original.caseId ? { to: '/expert-cases/details', search: { id: row.original.caseId } } : undefined}
        />
      ),
    },
    {
      id: 'amountCents',
      accessorFn: (row) => row.amountCents,
      header: t('amount'),
      cell: ({ row }) => (
        <TableStack
          width="fit"
          tone={row.original.kind === 'expense' ? 'error' : 'default'}
          description={
            row.original.status === 'canceled'
              ? `${t('annulled_amount')} ${formatMoney(row.original.amountCents)}`
              : row.original.status === 'partial'
                ? `${t('received')} ${formatMoney(row.original.receivedCents ?? 0)} · ${t('balance_due')} ${formatMoney(row.original.balanceCents ?? 0)}`
                : t(row.original.kind)
          }
        >
          {row.original.status === 'canceled'
            ? formatMoney(0)
            : `${row.original.kind === 'expense' ? '−' : ''}${formatMoney(row.original.amountCents)}`}
        </TableStack>
      ),
    },
    {
      id: 'dueDate',
      accessorFn: (row) => row.dueDate,
      header: t('due_date'),
      cell: ({ row }) => (
        <TableStack
          width="fit"
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
        return <TableStatus variant={STATE_VARIANT[state]}>{stateLabel(state)}</TableStatus>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { kind, status } = row.original;
        return (
          <TableRowActions label={t('actions')}>
            {status === 'canceled' ? (
              <TableRowAction onClick={() => onStatus(row.original, 'expected')}>{t('reactivate')}</TableRowAction>
            ) : (
              <>
                {kind === 'income' && status !== 'settled' && (
                  <TableRowAction onClick={() => onReceive(row.original)}>{t('register_receipt')}</TableRowAction>
                )}
                {kind === 'expense' && status !== 'settled' && (
                  <TableRowAction onClick={() => onPay(row.original)}>{t('mark_as_paid')}</TableRowAction>
                )}
                {kind === 'expense' && status === 'settled' && (
                  <TableRowAction onClick={() => onStatus(row.original, 'expected')}>{t('reopen')}</TableRowAction>
                )}
                <TableRowAction variant="destructive" onClick={() => onStatus(row.original, 'canceled')}>
                  {t('cancel_entry')}
                </TableRowAction>
              </>
            )}
          </TableRowActions>
        );
      },
    },
  ];
};

// Columns of the exported file (CSV, Excel, PDF): the table with the entry's details in columns of their own.
export const transactionExportColumns: TableExportColumn<TransactionRecord>[] = [
  { header: t('entry'), value: (row) => row.description },
  { header: t('type'), value: (row) => t(row.kind) },
  { header: t('category'), value: (row) => categoryLabel(row) },
  { header: t('expert_case'), value: (row) => row.caseNumber },
  { header: t('contracting_party'), value: (row) => row.client },
  {
    header: t('amount'),
    value: (row) =>
      row.status === 'canceled'
        ? formatMoney(0)
        : `${row.kind === 'expense' ? '-' : ''}${formatMoney(row.amountCents)}`,
  },
  { header: t('due_date'), value: (row) => day(row.dueDate) },
  { header: t('settled_on'), value: (row) => row.settledDate && day(row.settledDate) },
  { header: t('status'), value: (row) => stateLabel(transactionState(row, formatDisplayDate(new Date()))) },
];
