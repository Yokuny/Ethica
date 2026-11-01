import { ALL_DATAJUD_COURTS, DATAJUD_TECHNICAL_SUBJECTS, type DatajudSearch } from '@ethica/contracts';
import { z } from 'zod';
import { t } from '@/lib/helpers/translate.helper.js';

// Formulário da busca: só o que a pessoa digita; tamanho e cursor ficam no hook.
export const searchFormSchema = z.object({
  court: z.enum(ALL_DATAJUD_COURTS),
  technicalSubjects: z.array(z.enum(DATAJUD_TECHNICAL_SUBJECTS)),
  term: z.string().trim().max(120).optional(),
  courtUnit: z.string().trim().max(120).optional(),
  processNumber: z
    .string()
    .trim()
    .refine((value) => !value || (/^[\d.\-\s]+$/.test(value) && value.replace(/\D/g, '').length === 20), {
      message: t('invalid_process_number'),
    })
    .optional(),
  caseClassCode: z.number().int().positive().optional(),
  courtUnitCode: z.number().int().positive().optional(),
});
export type SearchForm = z.infer<typeof searchFormSchema>;
export type SearchQuery = Pick<
  DatajudSearch,
  'court' | 'technicalSubjects' | 'term' | 'courtUnit' | 'processNumber' | 'caseClassCode' | 'courtUnitCode'
>;

export const DEFAULT_SEARCH: SearchForm = {
  court: 'trt2',
  technicalSubjects: [...DATAJUD_TECHNICAL_SUBJECTS],
  term: '',
  courtUnit: '',
  processNumber: '',
};
export const PAGE_SIZE = 20;
