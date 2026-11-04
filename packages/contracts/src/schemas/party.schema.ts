import { z } from 'zod';
import { idSchema } from './id.schema.js';

// Reusable registry of parties and lawyers (AD-117). `party` keeps CPF/CNPJ;
// `lawyer` guarda a OAB.
export const PARTY_TYPES = ['party', 'lawyer'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const SIDES = ['plaintiff', 'defendant'] as const;
export type Side = (typeof SIDES)[number];

// "OAB/SP 123.456", "123456/SP" e "sp123456" viram "SP123456".
export const normalizeOab = (raw: string): string => {
  const value = raw
    .toUpperCase()
    .replace(/OAB/g, '')
    .replace(/[^A-Z0-9]/g, '');
  const reversed = value.match(/^(\d+)([A-Z]{2})$/);
  return reversed ? `${reversed[2]}${reversed[1]}` : value;
};

// "CREA-SC 184822-0", "crea/sc 184822-0" viram "SC1848220" (PSV-05).
export const normalizeCrea = (raw: string): string =>
  raw
    .toUpperCase()
    .replace(/CREA/g, '')
    .replace(/[^A-Z0-9]/g, '');

// Key to tell two names apart (PSV-05): no case, accent or repeated space difference.
export const partyNameKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// An empty form field becomes missing, never a saved empty string.
const emptyAsUndefined = (value: string) => value || undefined;

export const documentSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value === '' || /^(\d{11}|\d{14})$/.test(value), 'CPF/CNPJ inválido')
  .transform(emptyAsUndefined);

export const oabSchema = z
  .string()
  .max(30, 'OAB inválida')
  .transform(normalizeOab)
  .refine((value) => value === '' || /^[A-Z]{2}\d{1,7}[A-Z]?$/.test(value), 'OAB inválida (ex.: SP123456)')
  .transform(emptyAsUndefined);

export const creaSchema = z
  .string()
  .max(30, 'CREA inválido')
  .transform(normalizeCrea)
  .refine((value) => value === '' || /^[A-Z]{2}\d{3,12}[A-Z]?$/.test(value), 'CREA inválido (ex.: SC1848220)')
  .transform(emptyAsUndefined);

export const emailSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, 'e-mail inválido')
  .transform(emptyAsUndefined);
export const phoneSchema = z.string().trim().max(30, 'telefone inválido').transform(emptyAsUndefined);

const nameSchema = z.string().trim().min(1, 'nome é obrigatório').max(200, 'nome inválido');

const partyFields = z.object({
  name: nameSchema,
  document: documentSchema.optional(),
  oab: oabSchema.optional(),
  crea: creaSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
});

export const createPartySchema = partyFields.extend({ type: z.enum(PARTY_TYPES) }).strict();
export type CreateParty = z.infer<typeof createPartySchema>;

// The type does not change after registration: the cases keep a copy of it.
export const updatePartySchema = partyFields.partial().strict();
export type UpdateParty = z.infer<typeof updatePartySchema>;

// Party given in the case registration/edit: `partyId` uses the chosen record;
// without it, the API reuses by document/OAB or exact name, or creates one (AD-115).
export const casePartyInputSchema = z
  .object({
    partyId: idSchema.optional(),
    side: z.enum(SIDES),
    type: z.enum(PARTY_TYPES),
    name: nameSchema,
    document: documentSchema.optional(),
    oab: oabSchema.optional(),
    crea: creaSchema.optional(),
    // Contacts read from the process PDF (PSV-06): they fill what the registry does not have.
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    // Whoever hired the technical assistant (AD-135); at most one, only in that case.
    client: z.boolean().optional(),
  })
  .strict();
export type CasePartyInput = z.infer<typeof casePartyInputSchema>;
