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

// AD-010: findById/update/delete já são tenant-scoped — um id de outro tenant
// simplesmente não existe para esta sessão.
export class CaseNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Sem período imprescrito informado, grava o sugerido pelas datas do contrato (AD-115).
const withSuggestedPeriod = <T extends CreateCaseInput>(input: T): T => {
  if (input.nonPrescribedPeriodStart || input.nonPrescribedPeriodEnd) return input;
  const sugerido = suggestNonPrescribedPeriod(input);
  return sugerido
    ? { ...input, nonPrescribedPeriodStart: sugerido.inicio, nonPrescribedPeriodEnd: sugerido.fim }
    : input;
};

// Etapa e fase sempre coerentes (AD-133): a fase de uma etapa leva a perícia a ela; mudar só a
// etapa apaga a fase que não cabe; fase e etapa incoerentes no mesmo pedido são recusadas.
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

// Caminho único de criação (formulário, PDF, CSV, oportunidade): resolve as partes no
// cadastro (AD-117) e transforma o prazo do laudo no prazo "Entrega do laudo" (AD-109).
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
        titulo: REPORT_DELIVERY_DEADLINE,
        dueDate: reportDeadline,
        observacoes: 'Gerado a partir do prazo do laudo informado no cadastro.',
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
  // Honorário fixado pelo juízo ou contratado pelo assistente (AD-135), novo ou alterado,
  // vira receita a receber no financeiro.
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

// Excluir é ação de admin (pericia.router.ts) e leva os prazos junto; os laudos saem pelo
// evento `pericia:deleted` (AD-126). Compromissos e
// lançamentos que apontam para ela ficam sem o vínculo: referência ausente vira campo ausente.
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
    const proximos = await deadlineRepository.upcomingByCaseIds(
      tenantId,
      result.items.map((item) => item.id),
    );
    return {
      ...result,
      items: result.items.map((item) => {
        const nextDeadline = proximos.get(item.id);
        return nextDeadline ? { ...item, nextDeadline } : item;
      }),
    };
  } catch (error) {
    // Banco sem Atlas Search: erro explícito, nunca regex em silêncio (AD-054).
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

// DOC-03: abertas sem movimentação há mais de PERICIA_PARADA_DIAS dias (AD-121).
export const listStalled = async (tenantId: string, now: Date = new Date()): Promise<StalledCase[]> => {
  const today = dateInDisplayTz(now);
  const limite = new Date(Date.parse(`${today}T12:00:00Z`) - STALLED_CASE_DAYS * DAY_MS).toISOString().slice(0, 10);
  const stalled = await caseRepository.listStalled(tenantId, limite);
  return stalled.map((stalled) => ({ ...stalled, stalledDays: daysBetween(stalled.referencia, today) }));
};

export const listForExport = (tenantId: string) => caseRepository.listAll(tenantId);

export const caseStats = (tenantId: string) => caseRepository.stats(tenantId, DEADLINE_DUE_SOON_DAYS);
export const caseDistribution = (tenantId: string) => caseRepository.distribution(tenantId);
export const findSummariesByIds = (tenantId: string, ids: string[]) => caseRepository.findSummariesByIds(tenantId, ids);
