import {
  isPaymentAvailable,
  isPaymentIntent,
  matchRules,
  PAYMENT_RULE,
  proposalFits,
  type RuleMatch,
} from '@ethica/contracts';
import { CaseCourtSync, CourtProcess, dateInDisplayTz, listTrackedCases, type TrackedCase } from '@ethica/db';
import type { DatajudClient } from '../datajud/client.js';
import { insertCaseNotice, insertCourtMovementNotice, insertSuggestion } from '../queue/notification-writes.js';
import { enqueue } from '../queue/queue.js';

// Tracking in court (ADT-02, AD-277): once a day the cases of offices with the Automação Datajud are grouped
// by court and queried in batches. Every successful query is recorded (a case not found keeps only the date,
// PAC-02); a failed one records nothing and the batch is retried. The first time the court brings the process
// only records what it saw (baseline); afterwards
// each new movement enters one notice per case and day, and a movement a rule recognizes becomes a suggestion
// (the latest per rule) when it still fits the case. Nothing here changes a case (AD-268).

export const BATCH_SIZE = 50;
// The Datajud answers 429 in bursts (TRT16 on 2026-11-23, five times in 20 minutes): with the backoff capped at
// 30 minutes, 12 attempts keep a batch trying for some hours of the same day instead of waiting for the next one
// (AD-286).
export const BATCH_MAX_ATTEMPTS = 12;

export const enqueueCourtRefresh = async (
  now = new Date(),
): Promise<{ batches: number; courts: Record<string, number> }> => {
  const day = dateInDisplayTz(now);
  const byCourt = new Map<string, TrackedCase[]>();
  for (const item of await listTrackedCases(now)) byCourt.set(item.court, [...(byCourt.get(item.court) ?? []), item]);
  let batches = 0;
  for (const [court, items] of byCourt) {
    for (let start = 0; start < items.length; start += BATCH_SIZE) {
      const cases = items.slice(start, start + BATCH_SIZE);
      await enqueue(
        'court_refresh_batch',
        { court, day, cases },
        {
          dedupeKey: `court_refresh_batch:${day}:${court}:${start / BATCH_SIZE}`,
          priority: 30,
          maxAttempts: BATCH_MAX_ATTEMPTS,
        },
      );
      batches += 1;
    }
  }
  // Cases per court in the run, for the diagnosis (AD-287): which courts and how big when the 429 comes.
  return { batches, courts: Object.fromEntries([...byCourt].map(([court, items]) => [court, items.length])) };
};

export const refreshCourtBatch = async (
  datajud: DatajudClient,
  payload: { court: string; day: string; cases: TrackedCase[] },
  now = new Date(),
): Promise<{ processes: number; baselines: number; notices: number; suggestions: number; notFound: number }> => {
  const numbers = [...new Set(payload.cases.map((item) => item.processNumber))];
  const processes = await datajud.fetchProcesses(payload.court, numbers);
  for (const process of processes) {
    await CourtProcess.updateOne(
      { court: process.court, processNumber: process.processNumber, degree: process.degree },
      {
        $set: {
          className: process.className,
          courtUnitName: process.courtUnitName,
          sourceUpdatedAt: process.sourceUpdatedAt ? new Date(process.sourceUpdatedAt) : undefined,
          movements: process.movements.map((movement) => ({ ...movement, at: new Date(movement.at) })),
          fetchedAt: now,
        },
      },
      { upsert: true },
    );
  }

  let baselines = 0;
  let notices = 0;
  let suggestions = 0;
  let notFound = 0;
  for (const item of payload.cases) {
    // Every degree of the process (G1, G2…) is the same process for the case.
    const movements = processes
      .filter((process) => process.processNumber === item.processNumber)
      .flatMap((process) => process.movements);
    const caseKey = { Tenant: item.tenantId, Case: item.caseId };
    // Queried and not found (PAC-02): only the date of the query, so the page shows it; a case already synced
    // keeps its baseline.
    if (movements.length === 0) {
      notFound += 1;
      await CaseCourtSync.updateOne(
        caseKey,
        { $set: { court: item.court, processNumber: item.processNumber, syncedAt: now } },
        { upsert: true },
      );
      continue;
    }
    const sync = await CaseCourtSync.findOne(caseKey).lean();
    // First time the court brings the process (never queried, or not found until now): baseline, no notice.
    if (!sync?.baselineAt) {
      await CaseCourtSync.updateOne(
        caseKey,
        {
          $set: {
            court: item.court,
            processNumber: item.processNumber,
            seenMovementKeys: movements.map((movement) => movement.key),
            baselineAt: now,
            syncedAt: now,
          },
        },
        { upsert: true },
      );
      baselines += 1;
      continue;
    }
    const seen = new Set(sync.seenMovementKeys);
    const fresh = movements.filter((movement) => !seen.has(movement.key)).sort((a, b) => a.at.localeCompare(b.at));
    // The movements become "seen" only after their notice and suggestions are written (all idempotent by
    // `dedupeKey`): a batch that fails in the middle is retried and loses nothing.
    const markSeen = () =>
      CaseCourtSync.updateOne(
        { _id: sync._id },
        { $addToSet: { seenMovementKeys: { $each: fresh.map((movement) => movement.key) } }, $set: { syncedAt: now } },
      );
    const latest = fresh.at(-1);
    if (!latest) {
      await markSeen();
      continue;
    }
    const caseRef = { tenantId: item.tenantId, caseId: item.caseId, day: payload.day };
    const inserted = await insertCourtMovementNotice(
      {
        tenantId: item.tenantId,
        caseId: item.caseId,
        day: payload.day,
        count: fresh.length,
        latest: { code: latest.code, name: latest.name, at: latest.at },
      },
      now,
    );
    if (inserted) notices += 1;
    // The latest movement of each rule (several suspension movements on the same day are one suggestion).
    const byRule = new Map<string, RuleMatch>();
    for (const movement of fresh)
      for (const match of matchRules(movement, item.role)) byRule.set(match.rule.key, match);
    for (const { rule, proposal, movement } of byRule.values()) {
      if (proposalFits(item, proposal) !== 'apply') continue;
      const id = await insertSuggestion({
        tenantId: item.tenantId,
        caseId: item.caseId,
        court: item.court,
        ruleKey: rule.key,
        ruleVersion: rule.version,
        proposal,
        movement,
        dedupeKey: `suggestion:${item.caseId}:${rule.key}:${movement.key}`,
        severity: 'warning',
      });
      if (!id) continue;
      suggestions += 1;
      // Suspended: the court gives no new date, so the pending deadlines need a look (plan, section 4).
      if (rule.key === 'case_suspended') {
        await insertCaseNotice({ ...caseRef, topic: 'deadlines_review', module: 'expert_cases', movement }, now);
      }
    }
    // Payment (AD-269, AD-274): the intention is only a notice; the money available is a suggestion, one per
    // case and day (several alvarás on the same day are one), e-mailed right away.
    const intent = fresh.filter(isPaymentIntent).at(-1);
    if (intent) {
      await insertCaseNotice({ ...caseRef, topic: 'payment_in_progress', module: 'finance', movement: intent }, now);
    }
    const paid = fresh.filter(isPaymentAvailable).at(-1);
    if (paid) {
      const id = await insertSuggestion({
        tenantId: item.tenantId,
        caseId: item.caseId,
        court: item.court,
        ruleKey: PAYMENT_RULE.key,
        ruleVersion: PAYMENT_RULE.version,
        proposal: { target: 'transaction_installment', date: paid.at.slice(0, 10) },
        movement: paid,
        dedupeKey: `suggestion:${item.caseId}:${PAYMENT_RULE.key}:${paid.at.slice(0, 10)}`,
        severity: 'critical',
      });
      if (id) {
        suggestions += 1;
        await enqueue('email_immediate', { notificationId: id }, { dedupeKey: `email_immediate:${id}`, priority: 5 });
      }
    }
    await markSeen();
  }
  return { processes: processes.length, baselines, notices, suggestions, notFound };
};
