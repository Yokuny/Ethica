import { dateInDisplayTz } from '@ethica/db';
import { KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as lancamentoRepository from './lancamento.repository.js';
import type {
  CreateLancamento,
  LancamentoRecord,
  ListLancamentosQuery,
  UpdateLancamento,
} from './lancamento.schema.js';

export class LancamentoNotFoundError extends KeyedError {}

// Prazo padrão para receber honorários fixados quando o juízo não define data.
const DIAS_PARA_RECEBER_HONORARIOS = 30;

const shiftMonth = (month: string, offset: number): string => {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
};

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const withPericiaNumero = async (tenantId: string, items: LancamentoRecord[]): Promise<LancamentoRecord[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.periciaId ? [item.periciaId] : [])))];
  const numeros = await periciaService.findNumerosByIds(tenantId, ids);
  return items.map((item) => {
    const numero = item.periciaId ? numeros.get(item.periciaId) : undefined;
    return numero ? { ...item, periciaNumero: numero } : item;
  });
};

// Liquidar sem informar a data grava o dia de hoje.
const withLiquidacao = (data: UpdateLancamento, today: string): UpdateLancamento => {
  if (data.status === 'liquidado') return { ...data, liquidadoEm: data.liquidadoEm ?? today };
  return data;
};

export const createLancamento = async (tenantId: string, data: CreateLancamento): Promise<LancamentoRecord> => {
  if (data.periciaId) await periciaService.getPericia(tenantId, data.periciaId);
  return lancamentoRepository.createLancamento(tenantId, data);
};

export const updateLancamento = async (
  tenantId: string,
  id: string,
  data: UpdateLancamento,
  now: Date = new Date(),
): Promise<LancamentoRecord> => {
  if (data.periciaId) await periciaService.getPericia(tenantId, data.periciaId);
  const updated = await lancamentoRepository.updateLancamento(tenantId, id, withLiquidacao(data, dateInDisplayTz(now)));
  if (!updated) throw new LancamentoNotFoundError('not_found');
  return updated;
};

export const deleteLancamento = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await lancamentoRepository.deleteLancamento(tenantId, id);
  if (deletedCount === 0) throw new LancamentoNotFoundError('not_found');
};

export const listLancamentos = async (tenantId: string, query: ListLancamentosQuery, now: Date = new Date()) => {
  const result = await lancamentoRepository.listLancamentos(tenantId, query, dateInDisplayTz(now));
  return { ...result, items: await withPericiaNumero(tenantId, result.items) };
};

export const resumo = (tenantId: string, now: Date = new Date()) => {
  const today = dateInDisplayTz(now);
  const month = today.slice(0, 7);
  return lancamentoRepository.resumo(tenantId, {
    today,
    monthStart: `${month}-01`,
    nextMonthStart: `${shiftMonth(month, 1)}-01`,
  });
};

// Os últimos `meses` meses até o atual, do mais antigo para o mais recente.
export const fluxoMensal = (tenantId: string, meses: number, now: Date = new Date()) => {
  const month = dateInDisplayTz(now).slice(0, 7);
  return lancamentoRepository.fluxoMensal(
    tenantId,
    Array.from({ length: meses }, (_, index) => shiftMonth(month, index - meses + 1)),
  );
};

export const totaisPorCategoria = (tenantId: string, natureza: string) =>
  lancamentoRepository.totaisPorCategoria(tenantId, natureza);

// Subscriber de `pericia:honorarios_fixados`: o honorário vira receita a receber.
export const lancarHonorariosFixados = async (
  input: { tenantId: string; periciaId: string; numeroProcesso: string; valorCents: number },
  now: Date = new Date(),
): Promise<void> => {
  await lancamentoRepository.createLancamento(input.tenantId, {
    natureza: 'receita',
    categoria: 'honorarios_fixados',
    descricao: `Honorários fixados — ${input.numeroProcesso}`,
    valorCents: input.valorCents,
    vencimento: addDays(dateInDisplayTz(now), DIAS_PARA_RECEBER_HONORARIOS),
    periciaId: input.periciaId,
  });
};
