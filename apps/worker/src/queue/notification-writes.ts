import type { FinanceDueBucket } from '@ethica/contracts';
import { Notification } from '@ethica/db';

// The ONLY place of the worker that writes `Notification` (AD-263, AD-267, D7): it inserts notices (and, with the
// automation, suggestions) and never edits a deadline, an alert or a person's reading. Locked by a structural test.

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// A finance notice lives 30 days: after that the digest and the transaction itself tell the current state.
const FINANCE_NOTICE_DAYS = 30;

// One notice per transaction and due window (`dedupeKey`); an existing one is kept as is.
export const insertFinanceDueNotice = async (
  notice: {
    tenantId: string;
    transactionId: string;
    caseId?: string;
    bucket: FinanceDueBucket;
    description: string;
    dueDate: string;
    openCents: number;
  },
  now = new Date(),
): Promise<boolean> => {
  try {
    await Notification.create({
      Tenant: notice.tenantId,
      kind: 'notice',
      module: 'finance',
      source: 'system',
      topic: 'finance_due',
      severity: notice.bucket === 'overdue' ? 'warning' : 'info',
      params: {
        bucket: notice.bucket,
        description: notice.description,
        dueDate: notice.dueDate,
        openCents: notice.openCents,
      },
      Transaction: notice.transactionId,
      ...(notice.caseId ? { Case: notice.caseId } : {}),
      dedupeKey: `finance_due:${notice.transactionId}:${notice.bucket}`,
      expireAt: new Date(now.getTime() + FINANCE_NOTICE_DAYS * 86_400_000),
    });
    return true;
  } catch (e) {
    if (isDuplicateKey(e)) return false;
    throw e;
  }
};
