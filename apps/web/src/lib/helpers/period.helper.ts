import { z } from 'zod';

// Period of the panels (Dashboard, Automação): complete months only and, before them, the previous period of the
// same size (AD-255, AD-256). A number, so the URL reads `?months=6` (a string that looks like a number would be
// written quoted by the router).
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
export const periodSchema = z.coerce
  .number()
  .pipe(z.union([z.literal(6), z.literal(12)]))
  .catch(6);

// The period (last `months` items) and the previous one of the same size, from a series oldest → newest.
export const splitPeriod = <T>(rows: T[], months: number) => ({
  current: rows.slice(-months),
  previous: rows.slice(-2 * months, -months),
});

const percent = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  signDisplay: 'exceptZero',
  maximumFractionDigits: 0,
});

// Change against the previous period as a percentage; without a base there is nothing to compare.
export const percentChange = (current: number, previous: number) =>
  previous ? percent.format((current - previous) / Math.abs(previous)) : undefined;

export const direction = (current: number, previous: number) =>
  current > previous ? ('up' as const) : current < previous ? ('down' as const) : ('stable' as const);
