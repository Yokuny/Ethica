import { ALL_DATAJUD_TRIBUNAIS, DATAJUD_ASSUNTOS_TECNICOS, type DatajudSearch } from '@ethica/contracts';
import { z } from 'zod';
import { t } from '@/lib/helpers/translate.helper.js';

// Formulário da busca: só o que a pessoa digita; tamanho e cursor ficam no hook.
export const buscaFormSchema = z.object({
  tribunal: z.enum(ALL_DATAJUD_TRIBUNAIS),
  assuntosTecnicos: z.array(z.enum(DATAJUD_ASSUNTOS_TECNICOS)),
  termo: z.string().trim().max(120).optional(),
  orgaoJulgador: z.string().trim().max(120).optional(),
  numeroProcesso: z
    .string()
    .trim()
    .refine((value) => !value || (/^[\d.\-\s]+$/.test(value) && value.replace(/\D/g, '').length === 20), {
      message: t('invalid_process_number'),
    })
    .optional(),
  classeCodigo: z.number().int().positive().optional(),
  orgaoJulgadorCodigo: z.number().int().positive().optional(),
});
export type BuscaForm = z.infer<typeof buscaFormSchema>;
export type BuscaQuery = Pick<
  DatajudSearch,
  | 'tribunal'
  | 'assuntosTecnicos'
  | 'termo'
  | 'orgaoJulgador'
  | 'numeroProcesso'
  | 'classeCodigo'
  | 'orgaoJulgadorCodigo'
>;

export const DEFAULT_BUSCA: BuscaForm = {
  tribunal: 'trt2',
  assuntosTecnicos: [...DATAJUD_ASSUNTOS_TECNICOS],
  termo: '',
  orgaoJulgador: '',
  numeroProcesso: '',
};
export const PAGE_SIZE = 20;
