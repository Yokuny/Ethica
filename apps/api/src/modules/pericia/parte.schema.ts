import type { CreateParte, ParteTipo, PericiaParteInput, Polo, UpdateParte } from '@ethica/contracts';
import { createParteSchema, idSchema, PARTE_TIPOS, updateParteSchema } from '@ethica/contracts';
import { z } from 'zod';

export type { CreateParte, PericiaParteInput, UpdateParte };
export { createParteSchema, updateParteSchema };

export const parteIdParamSchema = z.object({ id: idSchema }).strict();

export const listPartesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    tipo: z.enum(PARTE_TIPOS).optional(),
  })
  .strict();
export type ListPartesQuery = z.infer<typeof listPartesQuerySchema>;

export type ParteRecord = {
  id: string;
  tipo: ParteTipo;
  nome: string;
  documento?: string;
  oab?: string;
  email?: string;
  telefone?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Parte já resolvida para gravar na perícia (cópia de tipo e nome, AD-117).
export type PericiaParteWrite = { parteId: string; polo: Polo; tipo: ParteTipo; nome: string; contratante?: boolean };
