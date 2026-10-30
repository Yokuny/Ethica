import { ALL_DATAJUD_TRIBUNAIS, type DatajudSearch } from '@ethica/contracts';
import { z } from 'zod';

// Formulário da busca: só o que a pessoa digita; tamanho e cursor ficam no hook.
export const buscaFormSchema = z.object({
  tribunal: z.enum(ALL_DATAJUD_TRIBUNAIS),
  termo: z.string().trim().max(120).optional(),
  orgaoJulgador: z.string().trim().max(120).optional(),
});
export type BuscaForm = z.infer<typeof buscaFormSchema>;
export type BuscaQuery = Pick<DatajudSearch, 'tribunal' | 'termo' | 'orgaoJulgador'>;

export const DEFAULT_BUSCA: BuscaForm = { tribunal: 'trt2', termo: 'perito', orgaoJulgador: '' };
export const PAGE_SIZE = 20;
