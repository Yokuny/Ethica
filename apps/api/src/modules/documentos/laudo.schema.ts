import type {
  ConcluirLaudo,
  CreateLaudo,
  CreateModeloLaudo,
  LaudoStatus,
  LaudoTipo,
  LaudoVariante,
  LaudoVariavel,
  ModeloSecao,
  MoverSecao,
  UpdateLaudoSecao,
  UpdateModeloLaudo,
} from '@ethica/contracts';
import {
  concluirLaudoSchema,
  createLaudoSchema,
  createModeloLaudoSchema,
  idSchema,
  LAUDO_MODELOS_PADRAO,
  LAUDO_STATUS,
  LAUDO_TIPOS,
  modeloSecaoSchema,
  moverSecaoSchema,
  updateLaudoSecaoSchema,
  updateModeloLaudoSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import type { CaseRecord } from '../case/case.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';

export type {
  ConcluirLaudo,
  CreateLaudo,
  CreateModeloLaudo,
  ModeloSecao,
  MoverSecao,
  UpdateLaudoSecao,
  UpdateModeloLaudo,
};
export {
  concluirLaudoSchema,
  createLaudoSchema,
  createModeloLaudoSchema,
  modeloSecaoSchema,
  moverSecaoSchema,
  updateLaudoSecaoSchema,
  updateModeloLaudoSchema,
};

// Modelo padrão tem id fixo (AD-126); o do escritório, ObjectId.
const modeloIdSchema = z.union([
  idSchema,
  z.enum([LAUDO_MODELOS_PADRAO.report, LAUDO_MODELOS_PADRAO.technical_opinion]),
]);

export const modeloIdParamSchema = z.object({ id: modeloIdSchema }).strict();
export const modeloSecaoParamSchema = z.object({ id: modeloIdSchema, secaoId: idSchema }).strict();
export const laudoIdParamSchema = z.object({ id: idSchema }).strict();
export const laudoSecaoParamSchema = z.object({ id: idSchema, secaoId: idSchema }).strict();

export const listModelosQuerySchema = z.object({ tipo: z.enum(LAUDO_TIPOS).optional() }).strict();
export type ListModelosQuery = z.infer<typeof listModelosQuerySchema>;

export const listLaudosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(LAUDO_STATUS).optional(),
    caseId: idSchema.optional(),
  })
  .strict();
export type ListLaudosQuery = z.infer<typeof listLaudosQuerySchema>;

export type LaudoRouterDeps = { validToken: RequestHandler; pdf: PdfRenderer; storage?: FileStorage };

export type ModeloSecaoRecord = ModeloSecao & { id: string };

export type ModeloLaudoRecord = {
  id: string;
  nome: string;
  tipo: LaudoTipo;
  // Modelo da biblioteca padrão: só leitura, clonável (AD-126).
  padrao: boolean;
  secoes: ModeloSecaoRecord[];
  updatedAt?: Date;
};

export type TemplateSummary = Omit<ModeloLaudoRecord, 'secoes'> & { totalSecoes: number };

export type LaudoSecaoRecord = {
  id: string;
  titulo: string;
  nivel: number;
  apenasTitulo: boolean;
  quebraPagina: boolean;
  variante: LaudoVariante;
  html: string;
};

export type LaudoSecaoWrite = Omit<LaudoSecaoRecord, 'id'>;

// Marcadores sem valor por seção (AD-126): bloqueiam exportar e concluir.
export type LaudoPendencia = { secaoId: string; variaveis: LaudoVariavel[] };

export type LaudoRecord = {
  id: string;
  caseId: string;
  // Enriquecido pelo service; ausente se a perícia não existe mais.
  caseNumber?: string;
  tipo: LaudoTipo;
  status: LaudoStatus;
  titulo: string;
  modeloNome: string;
  secoes: LaudoSecaoRecord[];
  pendencias: LaudoPendencia[];
  concluidoEm?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LaudoListItem = Omit<LaudoRecord, 'secoes' | 'pendencias'> & { totalSecoes: number };

export type LaudoCreateInput = {
  tenantId: string;
  caseId: string;
  userId: string;
  tipo: LaudoTipo;
  titulo: string;
  modeloNome: string;
  secoes: LaudoSecaoWrite[];
};

// O que o PDF e o Word recebem: seções com as variáveis já resolvidas de novo (AD-126).
export type LaudoExportDados = {
  laudo: LaudoRecord;
  legalCase: CaseRecord;
  identity: DocumentIdentity;
  expert: AccountView;
  values: Partial<Record<LaudoVariavel, string>>;
  // `src` da foto no HTML → bytes (AD-129); foto que sumiu fica fora e o `img` some.
  photos: Record<string, { body: Buffer; mime: string }>;
  geradoEm: Date;
};
