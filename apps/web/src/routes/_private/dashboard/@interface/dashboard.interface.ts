import { z } from 'zod';

// Months of the cash flow chart in the Dashboard.

export const PERIODS = ['6', '12'] as const;
export const PERIOD_LABEL: Record<(typeof PERIODS)[number], string> = {
  '6': 'last_6_months',
  '12': 'last_12_months',
};
export const dashboardSearchSchema = z.object({ months: z.enum(PERIODS).optional().default('6') });
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
