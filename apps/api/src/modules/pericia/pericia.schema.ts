import type { CreatePericia, Justica, PapelPericia, PericiaStatus, UpdatePericia } from '@ethica/contracts';
import { createPericiaSchema, idSchema, JUSTICAS, PERICIA_STATUS, updatePericiaSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { PericiaParteWrite } from './parte.schema.js';
import type { ProximoPrazo } from './prazo.schema.js';

export type { CreatePericia, UpdatePericia };
export { createPericiaSchema, updatePericiaSchema };

export const periciaIdParamSchema = z.object({ id: idSchema }).strict();

// Paginação validada na borda (nunca clamp silencioso no service).
export const listPericiasQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    status: z.enum(PERICIA_STATUS).optional(),
    justica: z.enum(JUSTICAS).optional(),
  })
  .strict();
export type ListPericiasQuery = z.infer<typeof listPericiasQuerySchema>;

export type PericiaRouterDeps = { validToken: RequestHandler };

export type PericiaRecord = {
  id: string;
  numeroProcesso: string;
  justica: Justica;
  papel: PapelPericia;
  tribunal: string;
  vara?: string;
  comarca?: string;
  objeto: string;
  partes: PericiaParteWrite[];
  status: PericiaStatus;
  dataNomeacao?: string;
  honorariosPropostosCents?: number;
  honorariosFixadosCents?: number;
  observacoes?: string;
  dataAutuacao?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  funcaoReclamante?: string;
  periodoImprescritoInicio?: string;
  periodoImprescritoFim?: string;
  localPericia?: string;
  oportunidadeId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePericiaInput = CreatePericia & { tenant: string; oportunidadeId?: string };

// O que o repository grava: partes já resolvidas no cadastro (AD-117), sem o prazo do laudo.
export type PericiaCreateWrite = Omit<CreatePericiaInput, 'prazoLaudo' | 'partes'> & { partes: PericiaParteWrite[] };
export type PericiaUpdateWrite = Omit<UpdatePericia, 'partes'> & { partes?: PericiaParteWrite[] };

// Listagem: cada perícia com o prazo pendente mais próximo (ausente se não há).
export type PericiaListItem = PericiaRecord & { proximoPrazo?: ProximoPrazo };

// Enriquecimento cross-módulo (agenda, financeiro, feed, aviso): número e os nomes das
// partes de cada polo (sem advogados), separados por vírgula.
export type PericiaResumo = { numeroProcesso: string; autor?: string; reu?: string };

export type PericiaDistribution = {
  status: { key: string; count: number }[];
  justica: { key: string; count: number }[];
};
