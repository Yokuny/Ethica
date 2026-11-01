import { z } from 'zod';

export const PERIODS = ['6', '12'] as const;
export const PERIOD_LABEL: Record<(typeof PERIODS)[number], string> = {
  '6': 'last_6_months',
  '12': 'last_12_months',
};
export const reportsSearchSchema = z.object({ months: z.enum(PERIODS).optional().default('6') });
export type ReportsSearch = z.infer<typeof reportsSearchSchema>;
