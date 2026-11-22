import type { CourtMovement } from '@ethica/contracts';
import { CourtProcess } from '@ethica/db';
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
