import { dateInDisplayTz } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as lancamentoRepository from './lancamento.repository.js';
import type {
  CreateLancamento,
  CreateParcela,
  FinanceiroRelatorio,
  FinanceiroRelatorioLinha,
  LancamentoRecord,
  ListLancamentosQuery,
  PericiaFinanceiroResumo,
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
  const resumos = await periciaService.findResumosByIds(tenantId, ids);
  return items.map((item) => {
    const numero = item.periciaId ? resumos.get(item.periciaId)?.numeroProcesso : undefined;
    return numero ? { ...item, periciaNumero: numero } : item;
  });
};

// Liquidar sem informar a data grava o dia de hoje.
const withLiquidacao = (data: UpdateLancamento, today: string): UpdateLancamento => {
  if (data.status === 'settled') return { ...data, liquidadoEm: data.liquidadoEm ?? today };
  return data;
};

export const createLancamento = async (tenantId: string, data: CreateLancamento): Promise<LancamentoRecord> => {
  if (data.periciaId) await periciaService.getPericia(tenantId, data.periciaId);
  return lancamentoRepository.createLancamento(tenantId, data);
};

const findOrThrow = async (tenantId: string, id: string): Promise<LancamentoRecord> => {
  const lancamento = await lancamentoRepository.findById(tenantId, id);
  if (!lancamento) throw new LancamentoNotFoundError('not_found');
  return lancamento;
};

// Honorário (AD-111): o status vem das parcelas, nunca do formulário, e o valor não fica
// abaixo do que já entrou na conta. Despesa segue com liquidar/reabrir/cancelar à mão.
// A natureza não muda depois de lançada: as regras de status são diferentes.
export const updateLancamento = async (
  tenantId: string,
  id: string,
  data: UpdateLancamento,
  now: Date = new Date(),
): Promise<LancamentoRecord> => {
  const current = await findOrThrow(tenantId, id);
  if (data.natureza && data.natureza !== current.natureza) throw new CustomError('invalid_data', 422);
  if (data.periciaId) await periciaService.getPericia(tenantId, data.periciaId);

  if (current.natureza === 'income') {
    if (data.status || data.liquidadoEm) throw new CustomError('fee_status_comes_from_parcels', 422);
    const updated = await lancamentoRepository.updateReceita(tenantId, id, data);
    if (!updated) throw new CustomError('amount_below_received', 422);
    return updated;
  }

  if (data.status === 'partial') throw new CustomError('invalid_data', 422);
  const updated = await lancamentoRepository.updateLancamento(tenantId, id, withLiquidacao(data, dateInDisplayTz(now)));
  if (!updated) throw new LancamentoNotFoundError('not_found');
  return updated;
};

export const deleteLancamento = async (tenantId: string, id: string): Promise<void> => {
  const current = await findOrThrow(tenantId, id);
  if (current.natureza === 'income') throw new CustomError('fee_cannot_be_removed', 409);
  const { deletedCount } = await lancamentoRepository.deleteLancamento(tenantId, id);
  if (deletedCount === 0) throw new LancamentoNotFoundError('not_found');
};

// Recebimento parcial (PRZ-02): a parcela não passa do saldo; o status é recalculado junto.
export const addParcela = async (tenantId: string, id: string, parcela: CreateParcela): Promise<LancamentoRecord> => {
  const current = await findOrThrow(tenantId, id);
  if (current.natureza !== 'income') throw new CustomError('invalid_data', 422);
  const updated = await lancamentoRepository.addParcela(tenantId, id, parcela);
  if (!updated) throw new CustomError('parcel_exceeds_balance', 422);
  return updated;
};

export const estornarParcela = async (tenantId: string, id: string, parcelaId: string): Promise<LancamentoRecord> => {
  const updated = await lancamentoRepository.removeParcela(tenantId, id, parcelaId);
  if (!updated) throw new LancamentoNotFoundError('not_found');
  return updated;
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

const soma = (linhas: FinanceiroRelatorioLinha[]) => linhas.reduce((total, linha) => total + linha.valorCents, 0);

// DOC-03: datas inclusivas. Cancelado não entra; honorário conta pelas parcelas (AD-111).
export const relatorioPeriodo = async (
  tenantId: string,
  periodo: { from: string; to: string },
): Promise<FinanceiroRelatorio> => {
  const noPeriodo = (day?: string): day is string => Boolean(day && day >= periodo.from && day <= periodo.to);
  const itens = await withPericiaNumero(
    tenantId,
    (await lancamentoRepository.listAll(tenantId, { periodo })).filter((item) => item.status !== 'canceled'),
  );
  const linha = (item: LancamentoRecord, data: string, valorCents: number, conta?: string) => ({
    data,
    descricao: item.descricao,
    categoria: item.categoria,
    valorCents,
    ...(item.periciaNumero ? { periciaNumero: item.periciaNumero } : {}),
    ...(conta ? { conta } : {}),
  });
  const receitas = itens.filter((item) => item.natureza === 'income');
  const despesas = itens.filter((item) => item.natureza === 'expense');
  const recebidos = receitas
    .flatMap((item) =>
      item.parcelas.filter((parcela) => noPeriodo(parcela.data)).map((p) => linha(item, p.data, p.valorCents, p.conta)),
    )
    .sort((a, b) => a.data.localeCompare(b.data));
  const pagos = despesas
    .filter((item) => item.status === 'settled' && noPeriodo(item.liquidadoEm))
    .map((item) => linha(item, item.liquidadoEm as string, item.valorCents))
    .sort((a, b) => a.data.localeCompare(b.data));
  const aReceber = receitas
    .filter((item) => (item.saldoCents ?? 0) > 0 && noPeriodo(item.vencimento))
    .map((item) => linha(item, item.vencimento, item.saldoCents as number));
  const aPagar = despesas
    .filter((item) => item.status === 'expected' && noPeriodo(item.vencimento))
    .map((item) => linha(item, item.vencimento, item.valorCents));
  const recebidoCents = soma(recebidos);
  const pagoCents = soma(pagos);
  const aReceberCents = soma(aReceber);
  const aPagarCents = soma(aPagar);
  return {
    recebidos,
    pagos,
    aReceber,
    aPagar,
    totais: {
      recebidoCents,
      pagoCents,
      saldoRealizadoCents: recebidoCents - pagoCents,
      aReceberCents,
      aPagarCents,
      saldoPrevistoCents: recebidoCents - pagoCents + aReceberCents - aPagarCents,
    },
  };
};

export const resumoDaPericia = async (tenantId: string, periciaId: string): Promise<PericiaFinanceiroResumo> => {
  const itens = (await lancamentoRepository.listAll(tenantId, { periciaId })).filter(
    (item) => item.status !== 'canceled',
  );
  const receitas = itens.filter((item) => item.natureza === 'income');
  const honorariosCents = receitas.reduce((total, item) => total + item.valorCents, 0);
  const recebidoCents = receitas.reduce((total, item) => total + (item.recebidoCents ?? 0), 0);
  return {
    honorariosCents,
    recebidoCents,
    saldoCents: honorariosCents - recebidoCents,
    despesasCents: itens
      .filter((item) => item.natureza === 'expense')
      .reduce((total, item) => total + item.valorCents, 0),
  };
};

export const listForExport = (tenantId: string) => lancamentoRepository.listAll(tenantId);

// Subscriber de `pericia:honorarios_fixados`: o honorário vira receita a receber. Se a perícia
// já tem o honorário fixado lançado, só o valor muda (AD-111) — recusado se ficar abaixo do
// recebido, o que o bus apenas registra no log.
export const lancarHonorariosFixados = async (
  input: { tenantId: string; periciaId: string; numeroProcesso: string; valorCents: number },
  now: Date = new Date(),
): Promise<void> => {
  const existente = await lancamentoRepository.findHonorarioFixado(input.tenantId, input.periciaId);
  if (existente) {
    const updated = await lancamentoRepository.updateReceita(input.tenantId, existente.id, {
      valorCents: input.valorCents,
    });
    if (!updated) throw new CustomError('amount_below_received', 422);
    return;
  }
  await lancamentoRepository.createLancamento(input.tenantId, {
    natureza: 'income',
    categoria: 'fixed_fees',
    descricao: `Honorários fixados — ${input.numeroProcesso}`,
    valorCents: input.valorCents,
    vencimento: addDays(dateInDisplayTz(now), DIAS_PARA_RECEBER_HONORARIOS),
    periciaId: input.periciaId,
  });
};
