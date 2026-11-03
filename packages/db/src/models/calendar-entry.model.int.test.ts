import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../tests/helpers/db.helper.js';
import { backfillCalendarEntries, CalendarEntry } from './calendar-entry.model.js';
import { Deadline } from './deadline.model.js';
import { Transaction } from './transaction.model.js';

describe('backfillCalendarEntries (AEV-05)', () => {
  useTestDb();

  it('puts the existing deadlines and transactions on the agenda once, only with the collection empty', async () => {
    const Tenant = new mongoose.Types.ObjectId();
    const Case = new mongoose.Types.ObjectId();
    await Deadline.create({
      Tenant,
      Case,
      title: 'Entrega do laudo',
      dueDate: '2026-12-20',
      status: 'filed',
      filedDate: '2026-12-18',
    });
    await Transaction.create({
      Tenant,
      kind: 'income',
      category: 'advance_fees',
      description: 'Adiantamento',
      amountCents: 100_000,
      dueDate: '2026-12-05',
      status: 'partial',
      installments: [{ amountCents: 40_000, date: '2026-12-07' }],
    });

    await backfillCalendarEntries();
    await backfillCalendarEntries();

    const entries = await CalendarEntry.find({}, { _id: 0, type: 1, date: 1, status: 1 }).sort({ date: 1 }).lean();
    expect(entries).toEqual([
      { type: 'income', date: '2026-12-05', status: 'open' },
      { type: 'receipt', date: '2026-12-07', status: 'done' },
      { type: 'deadline', date: '2026-12-20', status: 'done' },
    ]);
  });
});
