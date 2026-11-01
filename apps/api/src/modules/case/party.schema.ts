import type { CasePartyInput, CreateParty, PartyType, Side, UpdateParty } from '@ethica/contracts';
import { createPartySchema, idSchema, PARTY_TYPES, updatePartySchema } from '@ethica/contracts';
import { z } from 'zod';

export type { CasePartyInput, CreateParty, UpdateParty };
export { createPartySchema, updatePartySchema };

export const partyIdParamSchema = z.object({ id: idSchema }).strict();

export const listPartiesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    tipo: z.enum(PARTY_TYPES).optional(),
  })
  .strict();
export type ListPartiesQuery = z.infer<typeof listPartiesQuerySchema>;

export type PartyRecord = {
  id: string;
  tipo: PartyType;
  nome: string;
  document?: string;
  oab?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Parte já resolvida para gravar na perícia (cópia de tipo e nome, AD-117).
export type CasePartyWrite = { partyId: string; side: Side; tipo: PartyType; nome: string; client?: boolean };
