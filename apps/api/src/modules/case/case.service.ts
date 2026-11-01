import {
  type CasePhase,
  type CaseStatus,
  DEADLINE_DUE_SOON_DAYS,
  phaseFitsInStatus,
  phaseStatus,
  STALLED_CASE_DAYS,
  suggestNonPrescribedPeriod,
  validClient,
} from '@ethica/contracts';
import { dateInDisplayTz, TextSearchUnavailableError } from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as caseRepository from './case.repository.js';
import type {
  CaseListItem,
  CaseRecord,
  CreateCaseInput,
  CreateMovement,
  ListCasesQuery,
  StalledCase,
  UpdateCase,
} from './case.schema.js';
import * as deadlineRepository from './deadline.repository.js';
import { REPORT_DELIVERY_DEADLINE } from './deadline.schema.js';
import * as partyService from './party.service.js';

// AD-010: findById/update/delete are already tenant-scoped — an id from another tenant
// simply does not exist for this session.
export class CaseNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// With no non-prescribed period given, saves the one suggested by the contract dates (AD-115).
const withSuggestedPeriod = <T extends CreateCaseInput>(input: T): T => {
  if (input.nonPrescribedPeriodStart || input.nonPrescribedPeriodEnd) return input;
  const suggested = suggestNonPrescribedPeriod(input);
  return suggested
    ? { ...input, nonPrescribedPeriodStart: suggested.start, nonPrescribedPeriodEnd: suggested.end }
    : input;
};

// Status and phase always consistent (AD-133): a status phase moves the case to it; changing only the
// status clears a phase that does not fit; inconsistent phase and status in the same request are rejected.
export const resolveStatusAndPhase = (
  before: { status: CaseStatus; phase?: CasePhase },
  data: { status?: CaseStatus; phase?: CasePhase | null },
): { status: CaseStatus; phase: CasePhase | null } => {
  const status = data.status ?? (data.phase ? phaseStatus(data.phase) : undefined) ?? before.status;
  if (data.phase) {
    if (!phaseFitsInStatus(data.phase, status)) throw new CustomError('phase_stage_mismatch', 422);
    return { status, phase: data.phase };
  }
  if (data.phase === null || !before.phase) return { status, phase: null };
  return { status, phase: phaseFitsInStatus(before.phase, status) ? before.phase : null };
};

// Single creation path (form, PDF, CSV, opportunity): resolves the parties in the
// registry (AD-117) and turns the report deadline into the "Entrega do laudo" deadline (AD-109).
export const createCase = async (data: CreateCaseInput): Promise<CaseRecord> => {
  const { reportDeadline, parties, phase, ...input } = withSuggestedPeriod(data);
  if (!validClient({ role: input.role, parties })) throw new CustomError('invalid_contracting_party', 422);
  try {
    const legalCase = await caseRepository.createCase({
      ...input,
      ...(phase ? { phase, status: resolveStatusAndPhase({ status: 'appointed' }, { phase }).status } : {}),
      parties: await partyService.resolveParties(input.tenant, parties ?? []),
    });
    if (reportDeadline) {
      await deadlineRepository.createDeadline(input.tenant, legalCase.id, {
        title: REPORT_DELIVERY_DEADLINE,
        dueDate: reportDeadline,
        notes: 'Gerado a partir do prazo do laudo informado no cadastro.',
      });
    }
    return legalCase;
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new CustomError('expert_case_already_registered', 409);
    throw e;
  }
};

export const getCase = async (tenantId: string, id: string): Promise<CaseRecord> => {
  const legalCase = await caseRepository.findById(tenantId, id);
  if (!legalCase) throw new CaseNotFoundError('not_found');
  return legalCase;
};

export const updateCase = async (tenantId: string, id: string, data: UpdateCase): Promise<CaseRecord> => {
  const before = await getCase(tenantId, id);
  const { parties, status, phase, ...rest } = data;
  if (!validClient({ role: rest.role ?? before.role, parties: parties ?? before.parties })) {
    throw new CustomError('invalid_contracting_party', 422);
  }
  const resolved =
    status !== undefined || phase !== undefined ? resolveStatusAndPhase(before, { status, phase }) : undefined;
  const updated = await caseRepository.updateCase(tenantId, id, {
    ...rest,
    ...(resolved ? { status: resolved.status, phase: resolved.phase } : {}),
    parties: parties ? await partyService.resolveParties(tenantId, parties) : undefined,
  });
  if (!updated) throw new CaseNotFoundError('not_found');
  // Fee fixed by the court or contracted by the assistant (AD-135), new or changed,
  // becomes receivable income in finance.
  if (updated.fixedFeesCents && updated.fixedFeesCents !== before.fixedFeesCents) {
    domainEventBus.emit('case:fixed_fees', {
      tenantId,
      caseId: updated.id,
      processNumber: updated.processNumber,
      amountCents: updated.fixedFeesCents,
      category: updated.role === 'technical_assistant' ? 'contracted_fees' : 'fixed_fees',
    });
  }
  return updated;
};

// Deleting is an admin action (case.router.ts) and takes the deadlines along; the reports leave through the
// evento `pericia:deleted` (AD-126). Compromissos e
// transactions that point to it lose the link: a missing reference becomes a missing field.
export const deleteCase = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await caseRepository.deleteCase(tenantId, id);
  if (deletedCount === 0) throw new CaseNotFoundError('not_found');
  await deadlineRepository.deleteByCase(tenantId, id);
  domainEventBus.emit('case:deleted', { tenantId, caseId: id });
};

export const listCases = async (
  tenantId: string,
  query: ListCasesQuery,
): Promise<{ items: CaseListItem[]; total: number }> => {
  try {
    const result = await caseRepository.listCases(tenantId, query);
    const upcoming = await deadlineRepository.upcomingByCaseIds(
      tenantId,
      result.items.map((item) => item.id),
    );
    return {
      ...result,
      items: result.items.map((item) => {
        const nextDeadline = upcoming.get(item.id);
        return nextDeadline ? { ...item, nextDeadline } : item;
      }),
    };
  } catch (error) {
    // Database without Atlas Search: explicit error, never silent regex (AD-054).
    if (error instanceof TextSearchUnavailableError) throw new CustomError('search_unavailable', 503);
    throw error;
  }
};

export const addMovement = async (tenantId: string, id: string, data: CreateMovement): Promise<CaseRecord> => {
  const updated = await caseRepository.addMovement(tenantId, id, data);
  if (!updated) throw new CaseNotFoundError('not_found');
  return updated;
};

export const removeMovement = async (tenantId: string, id: string, movementId: string): Promise<CaseRecord> => {
  const updated = await caseRepository.removeMovement(tenantId, id, movementId);
  if (!updated) throw new CaseNotFoundError('not_found');
  return updated;
};

const DAY_MS = 86_400_000;
const daysBetween = (de: string, ate: string): number =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DAY_MS);

// DOC-03: open with no movement for more than CASE_STALLED_DAYS days (AD-121).
export const listStalled = async (tenantId: string, now: Date = new Date()): Promise<StalledCase[]> => {
  const today = dateInDisplayTz(now);
  const limit = new Date(Date.parse(`${today}T12:00:00Z`) - STALLED_CASE_DAYS * DAY_MS).toISOString().slice(0, 10);
  const stalled = await caseRepository.listStalled(tenantId, limit);
  return stalled.map((stalled) => ({ ...stalled, stalledDays: daysBetween(stalled.reference, today) }));
};

export const listForExport = (tenantId: string) => caseRepository.listAll(tenantId);

export const caseStats = (tenantId: string) => caseRepository.stats(tenantId, DEADLINE_DUE_SOON_DAYS);
export const caseDistribution = (tenantId: string) => caseRepository.distribution(tenantId);
export const findSummariesByIds = (tenantId: string, ids: string[]) => caseRepository.findSummariesByIds(tenantId, ids);
