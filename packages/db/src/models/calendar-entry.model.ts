import {
  CALENDAR_ENTRY_SOURCES,
  CALENDAR_ENTRY_STATUS,
  CALENDAR_ENTRY_TYPES,
  type CalendarEntrySource,
  type CalendarEntryStatus,
  type CalendarEntryType,
  deadlineAgendaEntries,
  transactionAgendaEntries,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';
import { Deadline } from './deadline.model.js';
import { Transaction } from './transaction.model.js';

// All-day agenda entry sent by another module (AD-169). `source` + `originId` name who owns it: the
// agenda replaces the entries of an origin on every change and never edits them itself.
export interface CalendarEntryDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  source: CalendarEntrySource;
  originId: string;
  type: CalendarEntryType;
  title: string;
  // Calendar date `YYYY-MM-DD` in the display time zone (AD-103).
  date: string;
  status: CalendarEntryStatus;
  amountCents?: number;
  Case?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const calendarEntrySchema = new Schema<CalendarEntryDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    source: { type: String, enum: CALENDAR_ENTRY_SOURCES, required: true },
    originId: { type: String, required: true },
    type: { type: String, enum: CALENDAR_ENTRY_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: CALENDAR_ENTRY_STATUS, required: true },
    amountCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
  },
  { timestamps: true },
);

calendarEntrySchema.index({ Tenant: 1, date: 1 });
calendarEntrySchema.index({ Tenant: 1, source: 1, originId: 1 });
calendarEntrySchema.index({ Tenant: 1, Case: 1 });

export const CalendarEntry = mongoose.model<CalendarEntryDocument>('CalendarEntry', calendarEntrySchema);

// First boot with the agenda by events (AEV-05): the deadlines and transactions that already exist
// enter the agenda. Runs only while the collection is empty; afterwards every change arrives by event.
export const backfillCalendarEntries = async (): Promise<void> => {
  if (await CalendarEntry.estimatedDocumentCount()) return;
  const [deadlines, transactions] = await Promise.all([Deadline.find().lean(), Transaction.find().lean()]);
  const docs = [
    ...deadlines.flatMap((deadline) =>
      deadlineAgendaEntries(deadline).map((entry) => ({
        ...entry,
        Tenant: deadline.Tenant,
        source: 'deadline' as const,
        originId: deadline._id.toString(),
        Case: deadline.Case,
      })),
    ),
    ...transactions.flatMap((transaction) =>
      transactionAgendaEntries(transaction).map((entry) => ({
        ...entry,
        Tenant: transaction.Tenant,
        source: 'transaction' as const,
        originId: transaction._id.toString(),
        Case: transaction.Case,
      })),
    ),
  ];
  if (docs.length) await CalendarEntry.insertMany(docs);
};
