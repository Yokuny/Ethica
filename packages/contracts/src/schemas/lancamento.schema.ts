import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

// Receita (honorário a receber) e despesa operacional ficam separadas por natureza.
export const LANCAMENTO_NATUREZAS = ['receita', 'despesa'] as const;
export type LancamentoNatureza = (typeof LANCAMENTO_NATUREZAS)[number];

export const LANCAMENTO_CATEGORIAS = {
  receita: ['honorarios_previos', 'honorarios_fixados', 'honorarios_parciais'],
  despesa: ['deslocamento', 'material', 'taxas', 'outras_despesas'],
} as const;
export type LancamentoCategoria = (typeof LANCAMENTO_CATEGORIAS)[LancamentoNatureza][number];
export const ALL_LANCAMENTO_CATEGORIAS = [...LANCAMENTO_CATEGORIAS.receita, ...LANCAMENTO_CATEGORIAS.despesa] as const;

// `previsto` vencido aparece como atrasado na tela; não é um status gravado.
export const LANCAMENTO_STATUS = ['previsto', 'liquidado', 'cancelado'] as const;
export type LancamentoStatus = (typeof LANCAMENTO_STATUS)[number];

const lancamentoFields = z.object({
  natureza: z.enum(LANCAMENTO_NATUREZAS),
  categoria: z.enum(ALL_LANCAMENTO_CATEGORIAS),
  descricao: z.string().trim().min(1, 'descrição é obrigatória').max(200, 'descrição inválida'),
  valorCents: z.number().int('valor deve ser inteiro').min(1, 'valor deve ser positivo'),
  vencimento: calendarDateSchema,
  periciaId: idSchema.optional(),
});

const categoriaDaNatureza = (data: { natureza?: LancamentoNatureza; categoria?: LancamentoCategoria }) =>
  !data.natureza ||
  !data.categoria ||
  (LANCAMENTO_CATEGORIAS[data.natureza] as readonly string[]).includes(data.categoria);

export const createLancamentoSchema = lancamentoFields
  .strict()
  .refine(categoriaDaNatureza, { message: 'categoria não pertence à natureza', path: ['categoria'] });
export type CreateLancamento = z.infer<typeof createLancamentoSchema>;

export const updateLancamentoSchema = lancamentoFields
  .partial()
  .extend({ status: z.enum(LANCAMENTO_STATUS).optional(), liquidadoEm: calendarDateSchema.optional() })
  .strict()
  .refine(categoriaDaNatureza, { message: 'categoria não pertence à natureza', path: ['categoria'] });
export type UpdateLancamento = z.infer<typeof updateLancamentoSchema>;
