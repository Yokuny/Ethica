import {
  type CaseInspection,
  type CasePayment,
  caseLabel,
  DEADLINE_DUE_SOON_DAYS,
  deadlineAgendaEntries,
  formatServiceOrder,
  isOwnType,
  type ServiceOrderSettings,
  STALLED_CASE_DAYS,
  suggestNonPrescribedPeriod,
  usesContractor,
  validClient,
  validServiceType,
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
import { REPORT_DELIVERY_DEADLINE, SERVICE_DELIVERY_DEADLINE } from './deadline.schema.js';
import * as partyService from './party.service.js';
import * as serviceOrderRepository from './service-order.repository.js';

// AD-010: findById/update/delete are already tenant-scoped — an id from another tenant
// simply does not exist for this session.
export class CaseNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// The repeated value: the service order number (NLA-01) or, otherwise, the process number.
const duplicateError = (e: unknown): CustomError =>
  (e as { keyPattern?: Record<string, unknown> }).keyPattern?.serviceOrder
    ? new CustomError('service_order_taken', 409)
    : new CustomError('expert_case_already_registered', 409);

export const getServiceOrder = (tenantId: string) => serviceOrderRepository.find(tenantId);

export const setServiceOrder = (tenantId: string, data: ServiceOrderSettings) =>
  serviceOrderRepository.save(tenantId, data);

// Next number of the office sequence (NLA-01), e.g. "ETH-2026-009"; `undefined` without a sequence.
const nextServiceOrder = async (tenantId: string): Promise<string | undefined> => {
  const sequence = await serviceOrderRepository.take(tenantId, Number(dateInDisplayTz(new Date()).slice(0, 4)));
  return sequence ? formatServiceOrder(sequence) : undefined;
};

// With no non-prescribed period given, saves the one suggested by the contract dates (AD-115).
const withSuggestedPeriod = <T extends CreateCaseInput>(input: T): T => {
  if (input.nonPrescribedPeriodStart || input.nonPrescribedPeriodEnd) return input;
  const suggested = suggestNonPrescribedPeriod(input);
  return suggested
    ? { ...input, nonPrescribedPeriodStart: suggested.start, nonPrescribedPeriodEnd: suggested.end }
    : input;
};

// The perícia date becomes the case's perícia appointment on the agenda (AD-160, AD-169), at registration
// and when editing; without a date there is none (PSV-03).
const scheduleInspection = (tenantId: string, legalCase: CaseRecord, inspection?: CaseInspection): void => {
  if (!inspection?.date || !inspection.time) return;
  domainEventBus.emit('agenda:entries_synced', {
    tenantId,
    source: 'case',
    originId: legalCase.id,
    caseId: legalCase.id,
    entries: [],
    inspection: {
      title: `Perícia — ${caseLabel(legalCase)}`,
      date: inspection.date,
      time: inspection.time,
      location: inspection.location,
    },
  });
};

// Fee fixed by the court or contracted (technical assistant, AD-135, or the office's own type, AD-176)
// becomes receivable income in finance; the payment given at registration becomes its receipt.
const postFees = (tenantId: string, legalCase: CaseRecord, received?: CasePayment): void => {
  if (!legalCase.fixedFeesCents) return;
  domainEventBus.emit('case:fixed_fees', {
    tenantId,
    caseId: legalCase.id,
    caseLabel: caseLabel(legalCase),
    amountCents: legalCase.fixedFeesCents,
    category: usesContractor(legalCase) ? 'contracted_fees' : 'fixed_fees',
    received,
  });
};

// Single creation path (form, PDF, CSV, opportunity): resolves the parties in the
// registry (AD-117) and turns the report deadline into the "Entrega do laudo" deadline (AD-109).
export const createCase = async (data: CreateCaseInput): Promise<CaseRecord> => {
  const { reportDeadline, parties, inspection, payment, ...input } = withSuggestedPeriod(data);
  if (!validClient({ role: input.role, parties })) throw new CustomError('invalid_contracting_party', 422);
  if (!validServiceType(input)) throw new CustomError('invalid_service_type', 422);
  try {
    const legalCase = await caseRepository.createCase({
      ...input,
      // Only a perícia has a sphere (AD-178).
      courtType: usesContractor(input) ? undefined : input.courtType,
      // Without the labor block (PSV-02), the perícia location is the case location ([LOCAL_PERICIA]).
      location: input.location ?? inspection?.location,
      serviceOrder: input.serviceOrder ?? (await nextServiceOrder(input.tenant)),
      parties: await partyService.resolveParties(input.tenant, parties ?? []),
    });
    if (reportDeadline) {
      // The office's own type delivers a service, not necessarily a report (AD-176).
      const own = isOwnType(legalCase);
      const deadline = await deadlineRepository.createDeadline(input.tenant, legalCase.id, {
        title: own ? SERVICE_DELIVERY_DEADLINE : REPORT_DELIVERY_DEADLINE,
        dueDate: reportDeadline,
        notes: own
          ? 'Gerado a partir da data de entrega informada no cadastro.'
          : 'Gerado a partir do prazo do laudo informado no cadastro.',
      });
      domainEventBus.emit('agenda:entries_synced', {
        tenantId: input.tenant,
        source: 'deadline',
        originId: deadline.id,
        caseId: legalCase.id,
        entries: deadlineAgendaEntries(deadline),
      });
    }
    scheduleInspection(input.tenant, legalCase, inspection);
    if (legalCase.fixedFeesCents) postFees(input.tenant, legalCase, payment);
    return legalCase;
  } catch (e) {
    if (isDuplicateKeyError(e)) throw duplicateError(e);
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
  const { parties, inspection, ...rest } = data;
  if (!validClient({ role: rest.role ?? before.role, parties: parties ?? before.parties })) {
    throw new CustomError('invalid_contracting_party', 422);
  }
  // `null` clears; missing keeps what was saved.
  const next = <T>(value: T | null | undefined, previous: T | undefined) =>
    value === null ? undefined : (value ?? previous);
  const role = rest.role ?? before.role;
  const serviceType = next(rest.serviceType, before.serviceType);
  const own = isOwnType({ serviceType });
  const contracted = usesContractor({ serviceType, role });
  const phase = rest.phase ?? before.phase;
  // Each type keeps only its fields (AD-158, AD-176, AD-178): the sphere in a perícia, the contractor in the
  // other types, the typed role and phase in the office's own type.
  const final = {
    courtType: contracted ? undefined : next(rest.courtType, before.courtType),
    serviceType: own ? serviceType : undefined,
    processNumber: rest.processNumber ?? before.processNumber,
    court: rest.court ?? before.court,
    role,
    phase,
    roleName: role === 'other' ? next(rest.roleName, before.roleName) : undefined,
    phaseName: phase === 'custom' ? next(rest.phaseName, before.phaseName) : undefined,
    contractor: contracted ? next(rest.contractor, before.contractor) : undefined,
  };
  if (!validServiceType(final)) throw new CustomError('invalid_service_type', 422);
  const unsetWhenGone = <T>(value: T | undefined, previous: unknown) => value ?? (previous ? null : undefined);
  const updated = await caseRepository
    .updateCase(tenantId, id, {
      ...rest,
      courtType: unsetWhenGone(final.courtType, before.courtType),
      serviceType: unsetWhenGone(final.serviceType, before.serviceType),
      roleName: unsetWhenGone(final.roleName, before.roleName),
      phaseName: unsetWhenGone(final.phaseName, before.phaseName),
      contractor: unsetWhenGone(final.contractor, before.contractor),
      parties: parties ? await partyService.resolveParties(tenantId, parties) : undefined,
    })
    .catch((e: unknown) => {
      throw isDuplicateKeyError(e) ? duplicateError(e) : e;
    });
  if (!updated) throw new CaseNotFoundError('not_found');
  // Fee fixed by the court or contracted by the assistant (AD-135), new or changed,
  // becomes receivable income in finance.
  if (updated.fixedFeesCents && updated.fixedFeesCents !== before.fixedFeesCents) postFees(tenantId, updated);
  scheduleInspection(tenantId, updated, inspection);
  return updated;
};

// Deleting is an admin action (case.router.ts) and takes the deadlines along; the reports and the agenda
// entries of those deadlines leave through `case:deleted` (AD-126, AD-169). Appointments and transactions
// that point to it lose the link: a missing reference becomes a missing field.
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
    const { deliveryFrom: from, deliveryTo: to } = query;
    const ids =
      from || to
        ? await deadlineRepository.caseIdsDueBetween(tenantId, [REPORT_DELIVERY_DEADLINE, SERVICE_DELIVERY_DEADLINE], {
            from,
            to,
          })
        : undefined;
    const result = await caseRepository.listCases(tenantId, query, ids);
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

export const listServiceTypes = (tenantId: string) => caseRepository.listServiceTypes(tenantId);

export const caseStats = (tenantId: string) => caseRepository.stats(tenantId, DEADLINE_DUE_SOON_DAYS);
export const caseDistribution = (tenantId: string) => caseRepository.distribution(tenantId);
export const findSummariesByIds = (tenantId: string, ids: string[]) => caseRepository.findSummariesByIds(tenantId, ids);
