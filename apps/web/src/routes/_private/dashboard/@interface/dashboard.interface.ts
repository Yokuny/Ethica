import { z } from 'zod';

// Months of the Dashboard's period (complete months) and, before it, the previous one of the same size. A number,
// so the URL reads `?months=6` (a string that looks like a number would be written quoted by the router).
export const PERIODS = [6, 12] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABEL: Record<Period, string> = {
  6: 'last_6_months',
  12: 'last_12_months',
};
export const PERIOD_SCOPE: Record<Period, string> = {
  6: 'last_6_months_vs_previous',
  12: 'last_12_months_vs_previous',
};
// Old links (`"6"`) and unknown values fall back to 6 months.
export const dashboardSearchSchema = z.object({
  months: z.coerce
    .number()
    .pipe(z.union([z.literal(6), z.literal(12)]))
    .catch(6),
  // Year of the revenue goal panel (AD-259); missing = the current one.
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  // Month (`YYYY-MM`) of the services mix; missing = every service since the start.
  mix: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .catch(undefined),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
