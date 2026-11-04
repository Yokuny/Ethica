import { z } from 'zod';
import { COURTTYPES } from './case.schema.js';

// Contact book of court divisions (varas) kept by the office (AD-151): it starts empty and grows on
// screen or by spreadsheet. The court type reuses the case one (labor, civil, federal).
export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;
export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || undefined)
    .optional();

const courtDivisionFields = z.object({
  courtType: z.enum(COURTTYPES),
  name: z.string().trim().min(1, 'nome da vara é obrigatório').max(200, 'nome da vara inválido'),
  court: optionalText(20, 'tribunal inválido'),
  state: z.enum(BRAZILIAN_STATES, 'UF inválida'),
  city: z.string().trim().min(1, 'cidade é obrigatória').max(120, 'cidade inválida'),
  address: optionalText(300, 'endereço inválido'),
  phones: optionalText(120, 'telefone inválido'),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.email().safeParse(value).success, 'e-mail inválido')
    .transform((value) => value || undefined)
    .optional(),
  virtualDesk: z
    .string()
    .trim()
    .max(500, 'link inválido')
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'link do balcão virtual inválido')
    .transform((value) => value || undefined)
    .optional(),
  notes: optionalText(1000, 'observações inválidas'),
});

export const createCourtDivisionSchema = courtDivisionFields.strict();
export type CreateCourtDivision = z.infer<typeof createCourtDivisionSchema>;

export const updateCourtDivisionSchema = courtDivisionFields.partial().strict();
export type UpdateCourtDivision = z.infer<typeof updateCourtDivisionSchema>;

// Spreadsheet (VAR-02): pt-BR columns, the single source of the template and of the parser.
export const COURT_DIVISION_CSV_COLUMNS = [
  'justica',
  'vara',
  'tribunal',
  'uf',
  'cidade',
  'endereco',
  'telefones',
  'email',
  'balcao_virtual',
  'observacoes',
] as const;
export type CourtDivisionCsvColumn = (typeof COURT_DIVISION_CSV_COLUMNS)[number];
export const COURT_DIVISION_CSV_REQUIRED: readonly CourtDivisionCsvColumn[] = ['justica', 'vara', 'uf', 'cidade'];
export const COURT_DIVISION_CSV_EXAMPLE: Record<CourtDivisionCsvColumn, string> = {
  justica: 'trabalho',
  vara: '1ª Vara do Trabalho de Campinas',
  tribunal: 'TRT15',
  uf: 'SP',
  cidade: 'Campinas',
  endereco: 'Rua Exemplo, 100 — Centro',
  telefones: '(19) 3000-0000',
  email: 'vt01campinas@trt15.jus.br',
  balcao_virtual: 'https://trt15.jus.br/balcao-virtual',
  observacoes: '',
};
// Spreadsheet word for each court type ("trabalho", "civel", "federal").
export const COURT_TYPE_CSV: Record<string, (typeof COURTTYPES)[number]> = {
  trabalho: 'labor',
  trabalhista: 'labor',
  civel: 'civil',
  cível: 'civil',
  federal: 'federal',
};
