import { z } from 'zod';
import { idSchema } from './id.schema.js';

// Cadastro reutilizável de partes e advogados (AD-117). `party` guarda CPF/CNPJ;
// `lawyer` guarda a OAB.
export const PARTE_TIPOS = ['party', 'lawyer'] as const;
export type ParteTipo = (typeof PARTE_TIPOS)[number];

export const POLOS = ['plaintiff', 'defendant'] as const;
export type Polo = (typeof POLOS)[number];

// "OAB/SP 123.456", "123456/SP" e "sp123456" viram "SP123456".
export const normalizarOab = (raw: string): string => {
  const value = raw
    .toUpperCase()
    .replace(/OAB/g, '')
    .replace(/[^A-Z0-9]/g, '');
  const invertida = value.match(/^(\d+)([A-Z]{2})$/);
  return invertida ? `${invertida[2]}${invertida[1]}` : value;
};

// Campo vazio do formulário vira ausente, nunca string vazia gravada.
const emptyAsUndefined = (value: string) => value || undefined;

export const documentoSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value === '' || /^(\d{11}|\d{14})$/.test(value), 'CPF/CNPJ inválido')
  .transform(emptyAsUndefined);

export const oabSchema = z
  .string()
  .max(30, 'OAB inválida')
  .transform(normalizarOab)
  .refine((value) => value === '' || /^[A-Z]{2}\d{1,7}[A-Z]?$/.test(value), 'OAB inválida (ex.: SP123456)')
  .transform(emptyAsUndefined);

const nomeSchema = z.string().trim().min(1, 'nome é obrigatório').max(200, 'nome inválido');

const parteFields = z.object({
  nome: nomeSchema,
  documento: documentoSchema.optional(),
  oab: oabSchema.optional(),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.email().safeParse(value).success, 'e-mail inválido')
    .transform(emptyAsUndefined)
    .optional(),
  telefone: z.string().trim().max(30, 'telefone inválido').transform(emptyAsUndefined).optional(),
});

export const createParteSchema = parteFields.extend({ tipo: z.enum(PARTE_TIPOS) }).strict();
export type CreateParte = z.infer<typeof createParteSchema>;

// O tipo não muda depois do cadastro: as perícias guardam uma cópia dele.
export const updateParteSchema = parteFields.partial().strict();
export type UpdateParte = z.infer<typeof updateParteSchema>;

// Parte informada no cadastro/edição da perícia: `parteId` usa o cadastro escolhido;
// sem ele, a API reaproveita por documento/OAB ou nome exato, ou cria (AD-115).
export const periciaParteInputSchema = z
  .object({
    parteId: idSchema.optional(),
    polo: z.enum(POLOS),
    tipo: z.enum(PARTE_TIPOS),
    nome: nomeSchema,
    documento: documentoSchema.optional(),
    oab: oabSchema.optional(),
    // Quem contratou o assistente técnico (AD-135); no máximo um, só nessa perícia.
    contratante: z.boolean().optional(),
  })
  .strict();
export type PericiaParteInput = z.infer<typeof periciaParteInputSchema>;
