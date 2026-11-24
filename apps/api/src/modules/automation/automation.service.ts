import { courtUnitFromNumber } from '@ethica/contracts';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as billingService from '../identity/billing.service.js';
import * as automationRepository from './automation.repository.js';
import type { CourtProcessView, TrackedCase } from './automation.schema.js';

// Automação Datajud (AD-268 to AD-271): the BFF only reads what the worker brought from the court.

// 403 `automation_required` for an office without the module (AD-276).
export const ensureAutomation = async (tenantId: string): Promise<void> => {
  if (!(await billingService.hasAutomationNow(tenantId))) throw new CustomError('automation_required', 403);
};

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
