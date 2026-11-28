import type { CourtMovement } from '@ethica/contracts';
import type { CourtProcessData } from '@ethica/datajud';
import { CaseCourtSync, CourtProcess, CourtSyncDay, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';

// CourtProcess is global public data (AD-271): no tenant filter here; the case of the office is checked before
// by the service.
export const findCourtProcess = async (court: string, processNumber: string) =>
  withDbTiming('automation.findCourtProcess', async () => {
    const docs = await CourtProcess.find({ court, processNumber }).lean();
    if (docs.length === 0) return null;
    const movements: CourtMovement[] = docs
      .flatMap((doc) => doc.movements)
      .map((movement) => ({ ...movement, at: movement.at.toISOString() }))
      .sort((a, b) => b.at.localeCompare(a.at));
    const newest = (values: (Date | undefined)[]) =>
      values.filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      court,
      processNumber,
      className: docs[0]?.className,
      courtUnitName: docs[0]?.courtUnitName,
      sourceUpdatedAt: newest(docs.map((doc) => doc.sourceUpdatedAt))?.toISOString(),
      fetchedAt: newest(docs.map((doc) => doc.fetchedAt))?.toISOString(),
      movements,
    };
  });

// What the worker recorded of each case (PAC-02): the last successful query, whether the court brought the process
// (baseline) and its newest movement. One query for the whole list.
export const findCourtSyncs = async (tenantId: string, caseIds: string[]) =>
  withDbTiming('automation.findCourtSyncs', async () => {
    type Sync = { found: boolean; syncedAt: string; lastMovementAt?: string; lastMovementName?: string };
    if (caseIds.length === 0) return new Map<string, Sync>();
    const docs = await CaseCourtSync.find(tenantScoped({ Tenant: tenantId, Case: { $in: caseIds } }))
      .select('Case baselineAt syncedAt lastMovementAt lastMovementName')
      .lean();
    return new Map(
      docs.map((doc): [string, Sync] => [
        doc.Case.toString(),
        {
          found: Boolean(doc.baselineAt),
          syncedAt: doc.syncedAt.toISOString(),
          ...(doc.lastMovementAt ? { lastMovementAt: doc.lastMovementAt.toISOString() } : {}),
          ...(doc.lastMovementName ? { lastMovementName: doc.lastMovementName } : {}),
        },
      ]),
    );
  });

// What the court knows of a number for the live lookup (SGD-06): the division (first degree first), the earliest
// filing day and every subject, and when it was fetched.
export const findCourtFill = async (court: string, processNumber: string) =>
  withDbTiming('automation.findCourtFill', async () => {
    const docs = await CourtProcess.find({ court, processNumber }).sort({ degree: 1 }).lean();
    if (docs.length === 0) return null;
    return {
      courtUnitName: docs.find((doc) => doc.courtUnitName)?.courtUnitName,
      filedAt: docs.flatMap((doc) => (doc.filedAt ? [doc.filedAt] : [])).sort()[0],
      subjects: [...new Set(docs.flatMap((doc) => doc.subjects ?? []))],
      fetchedAt: docs.map((doc) => doc.fetchedAt).sort((a, b) => b.getTime() - a.getTime())[0] as Date,
    };
  });

// The copy of the process the live lookup brought, the same the worker keeps (AD-271).
export const saveCourtProcesses = async (processes: CourtProcessData[], now: Date) =>
  withDbTiming('automation.saveCourtProcesses', async () => {
    for (const process of processes) {
      await CourtProcess.updateOne(
        { court: process.court, processNumber: process.processNumber, degree: process.degree },
        {
          $set: {
            className: process.className,
            courtUnitName: process.courtUnitName,
            filedAt: process.filedAt,
            subjects: process.subjects,
            sourceUpdatedAt: process.sourceUpdatedAt ? new Date(process.sourceUpdatedAt) : undefined,
            movements: process.movements.map((movement) => ({ ...movement, at: new Date(movement.at) })),
            fetchedAt: now,
          },
        },
        { upsert: true },
      );
    }
  });

// The day record of the office from a day on (PAT-06), oldest first; the answered set comes as its size only.
export const findSyncDays = async (tenantId: string, fromDay: string) =>
  withDbTiming('automation.findSyncDays', () =>
    CourtSyncDay.aggregate<{
      day: string;
      tracked: number;
      answered: number;
      newMovements: number;
      notices: { expert_cases: number; finance: number };
    }>([
      { $match: { Tenant: toObjectId(tenantId), day: { $gte: fromDay } } },
      {
        $project: {
          _id: 0,
          day: 1,
          tracked: 1,
          answered: { $size: '$answeredCases' },
          newMovements: 1,
          notices: 1,
        },
      },
      { $sort: { day: 1 } },
    ]),
  );
