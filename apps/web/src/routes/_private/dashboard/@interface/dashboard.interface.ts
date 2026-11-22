import { z } from 'zod';

// Months of the Dashboard's period: the cash flow and the categories (with the previous period of the same size).

export const PERIODS = ['6', '12'] as const;
export const PERIOD_LABEL: Record<(typeof PERIODS)[number], string> = {
  '6': 'last_6_months',
  '12': 'last_12_months',
};
export const PERIOD_SCOPE: Record<(typeof PERIODS)[number], string> = {
  '6': 'last_6_months_vs_previous',
  '12': 'last_12_months_vs_previous',
};
export const dashboardSearchSchema = z.object({ months: z.enum(PERIODS).optional().default('6') });
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
