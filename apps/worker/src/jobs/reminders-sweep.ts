import { FINANCE_DUE_SOON_DAYS, type FinanceDueBucket } from '@ethica/contracts';
import { dateInDisplayTz, listFinanceDueUntil } from '@ethica/db';
import { insertFinanceDueNotice } from '../queue/notification-writes.js';
import { addDays } from './format.js';

// Hourly sweep (CNT-03): each open transaction due in 7 days, today or overdue becomes one `finance_due`
// notice per window, for the bell of whoever sees finance. Deadlines need no notice: the digest reads them.
export const sweepReminders = async (now: Date = new Date()): Promise<{ created: number }> => {
  const today = dateInDisplayTz(now);
  const soon = addDays(today, FINANCE_DUE_SOON_DAYS);
  const items = await listFinanceDueUntil(soon);
  let created = 0;
  for (const item of items) {
    const bucket: FinanceDueBucket | undefined =
      item.dueDate < today
        ? 'overdue'
        : item.dueDate === today
          ? 'due_today'
          : item.dueDate === soon
            ? 'due_soon'
            : undefined;
    if (!bucket) continue;
    const inserted = await insertFinanceDueNotice(
      {
        tenantId: item.tenantId,
        transactionId: item.id,
        caseId: item.caseId,
        bucket,
        description: item.description,
        dueDate: item.dueDate,
        openCents: item.openCents,
      },
      now,
    );
    if (inserted) created += 1;
  }
  return { created };
};
