import { z } from 'zod';

export const PERIODOS = ['6', '12'] as const;
export const PERIODO_LABEL: Record<(typeof PERIODOS)[number], string> = {
  '6': 'last_6_months',
  '12': 'last_12_months',
};
export const relatoriosSearchSchema = z.object({ meses: z.enum(PERIODOS).optional().default('6') });
export type RelatoriosSearch = z.infer<typeof relatoriosSearchSchema>;
