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
    type: z.enum(PARTY_TYPES).optional(),
  })
  .strict();
export type ListPartiesQuery = z.infer<typeof listPartiesQuerySchema>;

export type PartyRecord = {
  id: string;
  type: PartyType;
  name: string;
  document?: string;
  oab?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Party already resolved to be saved on the case (copy of type and name, AD-117).
export type CasePartyWrite = { partyId: string; side: Side; type: PartyType; name: string; client?: boolean };
