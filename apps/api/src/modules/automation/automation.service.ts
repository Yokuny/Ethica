import { courtDivisionName, courtUnitFromNumber, isTrackedNumber } from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as automationRepository from './automation.repository.js';
import type { CourtLookup, CourtProcessView, DatajudClient, TrackedCase } from './automation.schema.js';

// Automação Datajud (AD-268 to AD-271): the BFF reads what the worker brought from the court; the live lookup by
// number (SGD-06, AD-304) is the only call it makes to the Datajud.

// Timeline of the case in court; null while the worker has not brought it yet (or the number has no court).
export const getCaseCourtProcess = async (tenantId: string, caseId: string): Promise<CourtProcessView | null> => {
  const legalCase = await caseService.getCase(tenantId, caseId);
  const unit = legalCase.processNumber ? courtUnitFromNumber(legalCase.processNumber) : undefined;
  if (!unit || !legalCase.processNumber) return null;
  return automationRepository.findCourtProcess(unit.court, legalCase.processNumber);
};

// Every case the worker follows (PAC-01), with what the court answered (PAC-02): no record = waiting for the first
// query; a record without baseline = not found in court. A case closed or canceled is not followed, so not listed.
export const listTrackedCases = async (tenantId: string): Promise<TrackedCase[]> => {
  const tracked = await caseService.listTrackedCasesOf(tenantId);
  const syncs = await automationRepository.findCourtSyncs(
    tenantId,
    tracked.map((item) => item.caseId),
  );
  return tracked.map((item): TrackedCase => {
    const sync = syncs.get(item.caseId);
    const base = { caseId: item.caseId, caseLabel: item.processNumber, court: item.court };
    if (!sync) return { ...base, status: 'waiting' };
    return { ...base, status: sync.found ? 'synced' : 'not_found', syncedAt: sync.syncedAt };
  });
};

// Fill a case by its number, live (SGD-06): the copy fetched today when there is one, otherwise one call to the
// Datajud (no retries: the worker retries in its daily run). Not found and secret are one answer (the client drops a
// secret process, AD-271); a court that does not answer is `court_unavailable`.
export const lookupCourtProcess = async (
  processNumber: string,
  datajud: DatajudClient | undefined,
  now = new Date(),
): Promise<CourtLookup> => {
  const unit = courtUnitFromNumber(processNumber);
  if (!unit || !isTrackedNumber(processNumber)) throw new CustomError('court_process_not_found', 404);
  let found = await automationRepository.findCourtFill(unit.court, processNumber);
  if (!found || dateInDisplayTz(found.fetchedAt) !== dateInDisplayTz(now)) {
    if (!datajud) throw new CustomError('court_unavailable', 503);
    let processes: Awaited<ReturnType<DatajudClient['fetchProcesses']>>;
    try {
      processes = await datajud.fetchProcesses(unit.court, [processNumber]);
    } catch {
      // The client already logged the call (`datajud.request`, AD-287).
      throw new CustomError('court_unavailable', 503);
    }
    if (processes.length === 0) throw new CustomError('court_process_not_found', 404);
    await automationRepository.saveCourtProcesses(processes, now);
    found = await automationRepository.findCourtFill(unit.court, processNumber);
  }
  if (!found) throw new CustomError('court_process_not_found', 404);
  return {
    ...unit,
    ...(found.courtUnitName ? { division: courtDivisionName(found.courtUnitName) } : {}),
    ...(found.filedAt ? { docketingDate: found.filedAt } : {}),
    ...(found.subjects.length > 0 ? { subject: found.subjects.join(', ') } : {}),
  };
};
