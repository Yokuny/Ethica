import type { CreateOportunidade, DatajudTribunal, OportunidadeStatus, UpdateOportunidade } from '@ethica/contracts';
import {
  createOportunidadeSchema,
  createPericiaSchema,
  datajudSearchSchema,
  idSchema,
  OPORTUNIDADE_STATUS,
  updateOportunidadeSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { DatajudClient, DatajudProcesso } from '../../providers/datajudClient.js';

export type { CreateOportunidade, UpdateOportunidade };
export { createOportunidadeSchema, datajudSearchSchema, updateOportunidadeSchema };

export const oportunidadeIdParamSchema = z.object({ id: idSchema }).strict();

export const listOportunidadesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(OPORTUNIDADE_STATUS).optional(),
  })
  .strict();
export type ListOportunidadesQuery = z.infer<typeof listOportunidadesQuerySchema>;

// Converter em perícia: o número, o tribunal e a vara vêm da oportunidade; o
// perito informa só o que o Datajud não traz.
export const converterOportunidadeSchema = createPericiaSchema
  .pick({ justica: true, papel: true, objeto: true, dataNomeacao: true, prazoLaudo: true })
  .strict();
export type ConverterOportunidade = z.infer<typeof converterOportunidadeSchema>;

export type ProspeccaoRouterDeps = { validToken: RequestHandler; datajud?: DatajudClient };

export type OportunidadeRecord = {
  id: string;
  numeroProcesso: string;
  tribunal: DatajudTribunal;
  classe?: string;
  assuntos: string[];
  orgaoJulgador?: string;
  dataAjuizamento?: string;
  ultimoMovimento?: string;
  ultimoMovimentoEm?: string;
  status: OportunidadeStatus;
  observacoes?: string;
  periciaId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Resultado da busca com a marca de quem já foi salvo como oportunidade.
export type DatajudResultado = DatajudProcesso & { oportunidadeId?: string };
