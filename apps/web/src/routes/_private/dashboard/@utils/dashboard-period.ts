import type { CaseDashboard } from '../@query/dashboard.js';

// Key of a service type: the office's own type by name, Perícia/Assistência by role.
export const typeKey = (row: { role: string; serviceType?: string }) => row.serviceType ?? row.role;

// Types from the busiest to the least busy (stable): the same order, and so the same color, in the mix donut
// and in the intake area (AD-255).
export const rankTypes = (byType: CaseDashboard['byType']) => [...byType].sort((a, b) => b.count - a.count);

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
