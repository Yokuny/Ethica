import { matchRules, proposalFits, type RuleMatch } from '@ethica/contracts';
import { CaseCourtSync, CourtProcess, dateInDisplayTz, listTrackedCases, type TrackedCase } from '@ethica/db';
import type { DatajudClient } from '../datajud/client.js';
import { insertCourtMovementNotice, insertSuggestion } from '../queue/notification-writes.js';
import { enqueue } from '../queue/queue.js';

// Tracking in court (ADT-02, AD-277): once a day the cases of offices with the Automação Datajud are grouped
// by court and queried in batches. The first sync of a case only records what it saw (baseline); afterwards
// each new movement enters one notice per case and day, and a movement a rule recognizes becomes a suggestion
// (the latest per rule) when it still fits the case. Nothing here changes a case (AD-268).

export const BATCH_SIZE = 50;

export const enqueueCourtRefresh = async (now = new Date()): Promise<{ batches: number }> => {
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
        { dedupeKey: `court_refresh_batch:${day}:${court}:${start / BATCH_SIZE}`, priority: 30 },
      );
      batches += 1;
    }
  }
  return { batches };
};

export const refreshCourtBatch = async (
  datajud: DatajudClient,
  payload: { court: string; day: string; cases: TrackedCase[] },
  now = new Date(),
): Promise<{ processes: number; baselines: number; notices: number; suggestions: number }> => {
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
  for (const item of payload.cases) {
    // Every degree of the process (G1, G2…) is the same process for the case.
    const movements = processes
      .filter((process) => process.processNumber === item.processNumber)
      .flatMap((process) => process.movements);
    if (movements.length === 0) continue;
    const sync = await CaseCourtSync.findOne({ Tenant: item.tenantId, Case: item.caseId }).lean();
    if (!sync) {
      await CaseCourtSync.create({
        Tenant: item.tenantId,
        Case: item.caseId,
        court: item.court,
        processNumber: item.processNumber,
        seenMovementKeys: movements.map((movement) => movement.key),
        baselineAt: now,
        syncedAt: now,
      });
      baselines += 1;
      continue;
    }
    const seen = new Set(sync.seenMovementKeys);
    const fresh = movements.filter((movement) => !seen.has(movement.key)).sort((a, b) => a.at.localeCompare(b.at));
    await CaseCourtSync.updateOne(
      { _id: sync._id },
      { $addToSet: { seenMovementKeys: { $each: fresh.map((movement) => movement.key) } }, $set: { syncedAt: now } },
    );
    const latest = fresh.at(-1);
    if (!latest) continue;
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
    for (const match of byRule.values()) {
      if (proposalFits(item, match.proposal) !== 'apply') continue;
      if (await insertSuggestion({ tenantId: item.tenantId, caseId: item.caseId, court: item.court, match }))
        suggestions += 1;
    }
  }
  return { processes: processes.length, baselines, notices, suggestions };
};
