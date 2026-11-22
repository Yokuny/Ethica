import { courtUnitFromNumber } from '@ethica/contracts';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as billingService from '../identity/billing.service.js';
import * as automationRepository from './automation.repository.js';
import type { CourtProcessView } from './automation.schema.js';

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
