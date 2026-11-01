import type { MidiaTipo, SaveVistoria, UpdateMidia, VistoriaDados } from '@ethica/contracts';
import {
  calendarDateSchema,
  idSchema,
  MIDIA_TIPOS,
  midiaIdSchema,
  saveVistoriaSchema,
  updateMidiaSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { CompromissoRecord } from './compromisso.schema.js';

export type { SaveVistoria, UpdateMidia, VistoriaDados };
export { saveVistoriaSchema, updateMidiaSchema };

export const vistoriaParamSchema = z.object({ compromissoId: idSchema }).strict();
export const vistoriaMidiaParamSchema = z.object({ compromissoId: idSchema, midiaId: midiaIdSchema }).strict();
export const vistoriaPericiaParamSchema = z.object({ periciaId: idSchema }).strict();
export const vistoriaDiaQuerySchema = z.object({ date: calendarDateSchema }).strict();
export type VistoriaDiaQuery = z.infer<typeof vistoriaDiaQuerySchema>;
export const midiaUploadQuerySchema = z
  .object({ tipo: z.enum(MIDIA_TIPOS), legenda: z.string().trim().max(200).optional() })
  .strict();
export type MidiaUploadQuery = z.infer<typeof midiaUploadQuerySchema>;

export type VistoriaRouterDeps = { validToken: RequestHandler; storage?: FileStorage };

export type MidiaRecord = {
  id: string;
  tipo: MidiaTipo;
  bytes: number;
  mime: string;
  legenda?: string;
  createdAt: Date;
};

// Registro de vistoria (AD-130). Sem registro gravado, `versao` 0 e dados vazios.
export type VistoriaRecord = {
  compromissoId: string;
  periciaId?: string;
  versao: number;
  dados: VistoriaDados;
  midias: MidiaRecord[];
  updatedAt?: Date;
};

export type VistoriaMidiaWrite = MidiaRecord & { key: string };

// Resumo da perícia no campo: número e partes por polo.
export type PericiaDoCampo = { id: string; numeroProcesso: string; autor?: string; reu?: string };

// Um compromisso do dia com o que o celular precisa sem conexão (AD-128).
export type VistoriaDoDia = { compromisso: CompromissoRecord; pericia?: PericiaDoCampo; vistoria: VistoriaRecord };
