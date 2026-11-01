import type {
  CreateLancamento,
  CreateParcela,
  LancamentoCategoria,
  LancamentoNatureza,
  LancamentoStatus,
  UpdateLancamento,
} from '@ethica/contracts';
import {
  calendarDateSchema,
  createLancamentoSchema,
  createParcelaSchema,
  idSchema,
  LANCAMENTO_NATUREZAS,
  LANCAMENTO_STATUS,
  updateLancamentoSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CreateLancamento, CreateParcela, UpdateLancamento };
export { createLancamentoSchema, createParcelaSchema, updateLancamentoSchema };

export const lancamentoIdParamSchema = z.object({ id: idSchema }).strict();
export const parcelaIdParamSchema = z.object({ id: idSchema, parcelaId: idSchema }).strict();

// `atrasado` é um recorte derivado (previsto ou parcial com vencimento antes de hoje), não um status gravado.
export const listLancamentosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    natureza: z.enum(LANCAMENTO_NATUREZAS).optional(),
    state: z.enum([...LANCAMENTO_STATUS, 'overdue']).optional(),
    caseId: idSchema.optional(),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
  })
  .strict();
export type ListLancamentosQuery = z.infer<typeof listLancamentosQuerySchema>;

export const fluxoQuerySchema = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }).strict();
export type FluxoQuery = z.infer<typeof fluxoQuerySchema>;

export const categoriasQuerySchema = z.object({ natureza: z.enum(LANCAMENTO_NATUREZAS) }).strict();

export type FinanceiroRouterDeps = { validToken: RequestHandler };

export type LancamentoRecord = {
  id: string;
  natureza: LancamentoNatureza;
  categoria: LancamentoCategoria;
  descricao: string;
  valorCents: number;
  vencimento: string;
  status: LancamentoStatus;
  liquidadoEm?: string;
  // Só receita (AD-111): parcelas recebidas, soma recebida e o que falta receber.
  parcelas: ParcelaRecord[];
  recebidoCents?: number;
  saldoCents?: number;
  caseId?: string;
  caseNumber?: string;
  // Quem contratou o assistente técnico da perícia (AD-135).
  client?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ParcelaRecord = { id: string; valorCents: number; data: string; conta?: string };

// Visão de raio-X: o que está a receber, o que entrou e saiu no mês e o que atrasou.
export type FinanceiroResumo = {
  aReceberCents: number;
  lateCents: number;
  receivedMonthCents: number;
  expensesMonthCents: number;
};

export type FluxoMensal = {
  month: string;
  recebidoCents: number;
  aReceberCents: number;
  despesasCents: number;
};

// Relatório financeiro de um período (DOC-03): o realizado (parcelas recebidas e despesas
// pagas no período) e o previsto (saldo de honorários e despesas a pagar que vencem nele).
export type FinanceiroRelatorioLinha = {
  data: string;
  descricao: string;
  categoria: LancamentoCategoria;
  valorCents: number;
  caseNumber?: string;
  conta?: string;
};

export type FinanceiroRelatorio = {
  recebidos: FinanceiroRelatorioLinha[];
  pagos: FinanceiroRelatorioLinha[];
  aReceber: FinanceiroRelatorioLinha[];
  aPagar: FinanceiroRelatorioLinha[];
  totais: {
    recebidoCents: number;
    pagoCents: number;
    actualBalanceCents: number;
    aReceberCents: number;
    aPagarCents: number;
    saldoPrevistoCents: number;
  };
};

// Resumo financeiro na ficha da perícia (DOC-02), só para admin/manager (AD-107).
export type CaseFinanceSummary = {
  feesCents: number;
  recebidoCents: number;
  saldoCents: number;
  despesasCents: number;
};

export type CategoriaTotal = { categoria: LancamentoCategoria; totalCents: number };
