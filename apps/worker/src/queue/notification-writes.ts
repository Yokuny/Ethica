import type { FinanceDueBucket, RuleMatch } from '@ethica/contracts';
import { Notification } from '@ethica/db';

// The ONLY place of the worker that writes `Notification` (AD-263, AD-267, D7): it inserts notices (and, with the
// automation, suggestions) and never edits a deadline, an alert or a person's reading. Locked by a structural test.

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// A finance notice lives 30 days: after that the digest and the transaction itself tell the current state.
const FINANCE_NOTICE_DAYS = 30;
// A court movement notice lives 180 days (plan, section 3); the timeline keeps the movement itself.
const COURT_NOTICE_DAYS = 180;

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

// The Automação Datajud ends in a few days (AD-275): one notice per office and end date. Returns the new id
// (the e-mail goes right away) or null when it already existed.
export const insertAutomationEndingNotice = async (
  notice: { tenantId: string; automationUntil: Date },
  now = new Date(),
): Promise<string | null> => {
  const day = notice.automationUntil.toISOString().slice(0, 10);
  try {
    const doc = await Notification.create({
      Tenant: notice.tenantId,
      kind: 'notice',
      module: 'finance',
      source: 'system',
      topic: 'automation_expiring',
      severity: 'critical',
      params: { automationUntil: notice.automationUntil.toISOString() },
      dedupeKey: `automation_expiring:${day}`,
      expireAt: new Date(now.getTime() + FINANCE_NOTICE_DAYS * 86_400_000),
    });
    return doc._id.toString();
  } catch (e) {
    if (isDuplicateKey(e)) return null;
    throw e;
  }
};

// New movements of a case in court (ADT-02): one notice per case and run day, grouping all of them.
export const insertCourtMovementNotice = async (
  notice: {
    tenantId: string;
    caseId: string;
    day: string;
    count: number;
    latest: { code: number; name: string; at: string };
  },
  now = new Date(),
): Promise<boolean> => {
  try {
    await Notification.create({
      Tenant: notice.tenantId,
      kind: 'notice',
      module: 'expert_cases',
      source: 'datajud',
      topic: 'court_movement',
      severity: 'info',
      Case: notice.caseId,
      params: {
        count: notice.count,
        latestCode: notice.latest.code,
        latestName: notice.latest.name,
        latestAt: notice.latest.at,
      },
      dedupeKey: `court_movement:${notice.caseId}:${notice.day}`,
      expireAt: new Date(now.getTime() + COURT_NOTICE_DAYS * 86_400_000),
    });
    return true;
  } catch (e) {
    if (isDuplicateKey(e)) return false;
    throw e;
  }
};

// A suggestion of the automation (AD-268): one per case, rule and movement; only a person applies it, in the BFF.
export const insertSuggestion = async (suggestion: {
  tenantId: string;
  caseId: string;
  court: string;
  match: RuleMatch;
}): Promise<boolean> => {
  const { rule, proposal, movement } = suggestion.match;
  try {
    await Notification.create({
      Tenant: suggestion.tenantId,
      kind: 'suggestion',
      module: 'expert_cases',
      source: 'datajud',
      status: 'pending',
      severity: 'warning',
      Case: suggestion.caseId,
      proposal,
      evidence: { court: suggestion.court, movement },
      ruleKey: rule.key,
      ruleVersion: rule.version,
      dedupeKey: `suggestion:${suggestion.caseId}:${rule.key}:${movement.key}`,
    });
    return true;
  } catch (e) {
    if (isDuplicateKey(e)) return false;
    throw e;
  }
};

// The only transitions the worker makes (D7): a pending suggestion becomes `expired` (office without the
// module) or `superseded` (the case already is as proposed, or the change no longer fits).
export const settleSuggestions = async (ids: string[], status: 'expired' | 'superseded'): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await Notification.updateMany(
    { _id: { $in: ids }, kind: 'suggestion', status: 'pending' },
    { $set: { status } },
  );
  return result.modifiedCount;
};
