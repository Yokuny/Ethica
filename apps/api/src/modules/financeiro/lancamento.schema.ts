import type {
  CreateLancamento,
  LancamentoCategoria,
  LancamentoNatureza,
  LancamentoStatus,
  UpdateLancamento,
} from '@ethica/contracts';
import {
  calendarDateSchema,
  createLancamentoSchema,
  idSchema,
  LANCAMENTO_NATUREZAS,
  LANCAMENTO_STATUS,
  updateLancamentoSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CreateLancamento, UpdateLancamento };
export { createLancamentoSchema, updateLancamentoSchema };

export const lancamentoIdParamSchema = z.object({ id: idSchema }).strict();

// `atrasado` é um recorte derivado (previsto com vencimento antes de hoje), não um status gravado.
export const listLancamentosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    natureza: z.enum(LANCAMENTO_NATUREZAS).optional(),
    situacao: z.enum([...LANCAMENTO_STATUS, 'atrasado']).optional(),
    periciaId: idSchema.optional(),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
  })
  .strict();
export type ListLancamentosQuery = z.infer<typeof listLancamentosQuerySchema>;

export const fluxoQuerySchema = z.object({ meses: z.coerce.number().int().min(1).max(24).default(6) }).strict();
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
  periciaId?: string;
  periciaNumero?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Visão de raio-X: o que está a receber, o que entrou e saiu no mês e o que atrasou.
export type FinanceiroResumo = {
  aReceberCents: number;
  atrasadoCents: number;
  recebidoMesCents: number;
  despesasMesCents: number;
};

export type FluxoMensal = {
  mes: string;
  recebidoCents: number;
  aReceberCents: number;
  despesasCents: number;
};

export type CategoriaTotal = { categoria: LancamentoCategoria; totalCents: number };
