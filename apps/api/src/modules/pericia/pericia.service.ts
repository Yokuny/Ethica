import { PERICIA_PARADA_DIAS, PRAZO_VENCE_EM_BREVE_DIAS, sugerirPeriodoImprescrito } from '@ethica/contracts';
import { dateInDisplayTz, TextSearchUnavailableError } from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as parteService from './parte.service.js';
import * as periciaRepository from './pericia.repository.js';
import type {
  CreateMovimentacao,
  CreatePericiaInput,
  ListPericiasQuery,
  PericiaListItem,
  PericiaParada,
  PericiaRecord,
  UpdatePericia,
} from './pericia.schema.js';
import * as prazoRepository from './prazo.repository.js';
import { PRAZO_ENTREGA_LAUDO } from './prazo.schema.js';

// AD-010: findById/update/delete já são tenant-scoped — um id de outro tenant
// simplesmente não existe para esta sessão.
export class PericiaNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Sem período imprescrito informado, grava o sugerido pelas datas do contrato (AD-115).
const comPeriodoSugerido = <T extends CreatePericiaInput>(input: T): T => {
  if (input.periodoImprescritoInicio || input.periodoImprescritoFim) return input;
  const sugerido = sugerirPeriodoImprescrito(input);
  return sugerido
    ? { ...input, periodoImprescritoInicio: sugerido.inicio, periodoImprescritoFim: sugerido.fim }
    : input;
};

// Caminho único de criação (formulário, PDF, CSV, oportunidade): resolve as partes no
// cadastro (AD-117) e transforma o prazo do laudo no prazo "Entrega do laudo" (AD-109).
export const createPericia = async (data: CreatePericiaInput): Promise<PericiaRecord> => {
  const { prazoLaudo, partes, ...input } = comPeriodoSugerido(data);
  try {
    const pericia = await periciaRepository.createPericia({
      ...input,
      partes: await parteService.resolvePartes(input.tenant, partes ?? []),
    });
    if (prazoLaudo) {
      await prazoRepository.createPrazo(input.tenant, pericia.id, {
        titulo: PRAZO_ENTREGA_LAUDO,
        vencimento: prazoLaudo,
        observacoes: 'Gerado a partir do prazo do laudo informado no cadastro.',
      });
    }
    return pericia;
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new CustomError('expert_case_already_registered', 409);
    throw e;
  }
};

export const getPericia = async (tenantId: string, id: string): Promise<PericiaRecord> => {
  const pericia = await periciaRepository.findById(tenantId, id);
  if (!pericia) throw new PericiaNotFoundError('not_found');
  return pericia;
};

export const updatePericia = async (tenantId: string, id: string, data: UpdatePericia): Promise<PericiaRecord> => {
  const before = await getPericia(tenantId, id);
  const { partes, ...rest } = data;
  const updated = await periciaRepository.updatePericia(tenantId, id, {
    ...rest,
    partes: partes ? await parteService.resolvePartes(tenantId, partes) : undefined,
  });
  if (!updated) throw new PericiaNotFoundError('not_found');
  // Honorário fixado pelo juízo (novo ou alterado) vira receita a receber no financeiro.
  if (updated.honorariosFixadosCents && updated.honorariosFixadosCents !== before.honorariosFixadosCents) {
    domainEventBus.emit('pericia:honorarios_fixados', {
      tenantId,
      periciaId: updated.id,
      numeroProcesso: updated.numeroProcesso,
      valorCents: updated.honorariosFixadosCents,
    });
  }
  return updated;
};

// Excluir é ação de admin (pericia.router.ts) e leva os prazos junto; os laudos saem pelo
// evento `pericia:deleted` (AD-126). Compromissos e
// lançamentos que apontam para ela ficam sem o vínculo: referência ausente vira campo ausente.
export const deletePericia = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await periciaRepository.deletePericia(tenantId, id);
  if (deletedCount === 0) throw new PericiaNotFoundError('not_found');
  await prazoRepository.deleteByPericia(tenantId, id);
  domainEventBus.emit('pericia:deleted', { tenantId, periciaId: id });
};

export const listPericias = async (
  tenantId: string,
  query: ListPericiasQuery,
): Promise<{ items: PericiaListItem[]; total: number }> => {
  try {
    const result = await periciaRepository.listPericias(tenantId, query);
    const proximos = await prazoRepository.proximosByPericiaIds(
      tenantId,
      result.items.map((item) => item.id),
    );
    return {
      ...result,
      items: result.items.map((item) => {
        const proximoPrazo = proximos.get(item.id);
        return proximoPrazo ? { ...item, proximoPrazo } : item;
      }),
    };
  } catch (error) {
    // Banco sem Atlas Search: erro explícito, nunca regex em silêncio (AD-054).
    if (error instanceof TextSearchUnavailableError) throw new CustomError('search_unavailable', 503);
    throw error;
  }
};

export const addMovimentacao = async (
  tenantId: string,
  id: string,
  data: CreateMovimentacao,
): Promise<PericiaRecord> => {
  const updated = await periciaRepository.addMovimentacao(tenantId, id, data);
  if (!updated) throw new PericiaNotFoundError('not_found');
  return updated;
};

export const removeMovimentacao = async (
  tenantId: string,
  id: string,
  movimentacaoId: string,
): Promise<PericiaRecord> => {
  const updated = await periciaRepository.removeMovimentacao(tenantId, id, movimentacaoId);
  if (!updated) throw new PericiaNotFoundError('not_found');
  return updated;
};

const DIA_MS = 86_400_000;
const diasEntre = (de: string, ate: string): number =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA_MS);

// DOC-03: abertas sem movimentação há mais de PERICIA_PARADA_DIAS dias (AD-121).
export const listParadas = async (tenantId: string, now: Date = new Date()): Promise<PericiaParada[]> => {
  const today = dateInDisplayTz(now);
  const limite = new Date(Date.parse(`${today}T12:00:00Z`) - PERICIA_PARADA_DIAS * DIA_MS).toISOString().slice(0, 10);
  const paradas = await periciaRepository.listParadas(tenantId, limite);
  return paradas.map((parada) => ({ ...parada, diasParada: diasEntre(parada.referencia, today) }));
};

export const listForExport = (tenantId: string) => periciaRepository.listAll(tenantId);

export const periciaStats = (tenantId: string) => periciaRepository.stats(tenantId, PRAZO_VENCE_EM_BREVE_DIAS);
export const periciaDistribution = (tenantId: string) => periciaRepository.distribution(tenantId);
export const findResumosByIds = (tenantId: string, ids: string[]) => periciaRepository.findResumosByIds(tenantId, ids);
