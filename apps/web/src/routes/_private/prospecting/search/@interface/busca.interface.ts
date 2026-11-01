import { ALL_DATAJUD_COURTS, DATAJUD_TECHNICAL_SUBJECTS, type DatajudSearch } from '@ethica/contracts';
import { z } from 'zod';
import { t } from '@/lib/helpers/translate.helper.js';

// Formulário da busca: só o que a pessoa digita; tamanho e cursor ficam no hook.
export const buscaFormSchema = z.object({
  court: z.enum(ALL_DATAJUD_COURTS),
  technicalSubjects: z.array(z.enum(DATAJUD_TECHNICAL_SUBJECTS)),
  termo: z.string().trim().max(120).optional(),
  orgaoJulgador: z.string().trim().max(120).optional(),
  processNumber: z
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
  'court' | 'technicalSubjects' | 'termo' | 'orgaoJulgador' | 'processNumber' | 'classeCodigo' | 'orgaoJulgadorCodigo'
>;

export const DEFAULT_BUSCA: BuscaForm = {
  court: 'trt2',
  technicalSubjects: [...DATAJUD_TECHNICAL_SUBJECTS],
  termo: '',
  orgaoJulgador: '',
  processNumber: '',
};
export const PAGE_SIZE = 20;
