import type { CourtMovement } from '@ethica/contracts';
import { CaseCourtSync, CourtProcess, tenantScoped } from '@ethica/db';
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

// What the worker recorded of each case (PAC-02): the last successful query and, if the court brought it, the
// baseline. One query for the whole list.
export const findCourtSyncs = async (tenantId: string, caseIds: string[]) =>
  withDbTiming('automation.findCourtSyncs', async () => {
    if (caseIds.length === 0) return new Map<string, { found: boolean; syncedAt: string }>();
    const docs = await CaseCourtSync.find(tenantScoped({ Tenant: tenantId, Case: { $in: caseIds } }))
      .select('Case baselineAt syncedAt')
      .lean();
    return new Map(
      docs.map((doc) => [
        doc.Case.toString(),
        { found: Boolean(doc.baselineAt), syncedAt: doc.syncedAt.toISOString() },
      ]),
    );
  });
