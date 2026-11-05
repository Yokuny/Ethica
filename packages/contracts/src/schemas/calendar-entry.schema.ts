import type { DeadlineStatus } from './deadline.schema.js';
import type { TransactionKind, TransactionStatus } from './transaction.schema.js';

// All-day agenda entries sent by other modules (AEV-01, AD-169): each origin (a deadline, a
// transaction) replaces its own entries on every change. A timed entry (the perícia of a case) becomes
// an appointment instead.
export const CALENDAR_ENTRY_SOURCES = ['deadline', 'transaction'] as const;
export type CalendarEntrySource = (typeof CALENDAR_ENTRY_SOURCES)[number];

export const CALENDAR_ENTRY_TYPES = ['deadline', 'income', 'expense', 'receipt'] as const;
export type CalendarEntryType = (typeof CALENDAR_ENTRY_TYPES)[number];
// Finance types: only whoever sees finance gets them (AD-137).
export const FINANCE_ENTRY_TYPES: readonly CalendarEntryType[] = ['income', 'expense', 'receipt'];

// Done = deadline filed or transaction settled; paid or canceled entries stay on the day (AEV-03).
export const CALENDAR_ENTRY_STATUS = ['open', 'done', 'missed', 'canceled'] as const;
export type CalendarEntryStatus = (typeof CALENDAR_ENTRY_STATUS)[number];

export type CalendarEntryInput = {
  type: CalendarEntryType;
  title: string;
  date: string;
  status: CalendarEntryStatus;
  amountCents?: number;
};

const DEADLINE_STATUS_ENTRY: Record<DeadlineStatus, CalendarEntryStatus> = {
  pending: 'open',
  filed: 'done',
  missed: 'missed',
  done: 'done',
};

export const deadlineAgendaEntries = (deadline: {
  title: string;
  dueDate: string;
  status: DeadlineStatus;
}): CalendarEntryInput[] => [
  { type: 'deadline', title: deadline.title, date: deadline.dueDate, status: DEADLINE_STATUS_ENTRY[deadline.status] },
];

// The due day of the transaction and, for a fee, each installment on the day it hit the account.
export const transactionAgendaEntries = (transaction: {
  kind: TransactionKind;
  description: string;
  amountCents: number;
  dueDate: string;
  status: TransactionStatus;
  installments?: { amountCents: number; date: string }[];
}): CalendarEntryInput[] => [
  {
    type: transaction.kind,
    title: transaction.description,
    date: transaction.dueDate,
    status: transaction.status === 'settled' ? 'done' : transaction.status === 'canceled' ? 'canceled' : 'open',
    amountCents: transaction.amountCents,
  },
  ...(transaction.installments ?? []).map((installment) => ({
    type: 'receipt' as const,
    title: transaction.description,
    date: installment.date,
    status: 'done' as const,
    amountCents: installment.amountCents,
  })),
];
