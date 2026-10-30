import { DISPLAY_TIMEZONE, type ListStatsTrend } from '@ethica/contracts';
import type { Model } from 'mongoose';
import { toObjectId } from './textSearch.js';
import { dateInDisplayTz, wallClockToUtc } from './time.js';

type TrendMode = 'period' | 'daily-average';

const shiftDay = (day: string, offset: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

// Cada série compara eventos reais por dia no fuso de exibição; `match` contém
// apenas condições de domínio, nunca o tenant injetado pelo servidor.
export const dailyTrend = async <T>(
  model: Model<T>,
  tenantId: string,
  dateField: string,
  match: Record<string, unknown> = {},
  mode: TrendMode = 'period',
  now: Date = new Date(),
): Promise<ListStatsTrend> => {
  const today = dateInDisplayTz(now);
  const start = wallClockToUtc(shiftDay(today, -59), '00:00');
  const end = wallClockToUtc(shiftDay(today, 1), '00:00');
  const daily = await model.aggregate<{ _id: string; count: number }>([
    { $match: { ...match, Tenant: toObjectId(tenantId), [dateField]: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: DISPLAY_TIMEZONE } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(daily.map(({ _id, count }) => [_id, count]));
  const values = Array.from({ length: 60 }, (_, index) => byDay.get(shiftDay(today, index - 59)) ?? 0);
  const series = values.slice(30);
  const previousTotal = (mode === 'daily-average' ? values.slice(29, 59) : values.slice(0, 30)).reduce(
    (sum, count) => sum + count,
    0,
  );
  const previous = mode === 'daily-average' ? previousTotal / 30 : previousTotal;
  const current = mode === 'daily-average' ? (series[29] ?? 0) : series.reduce((sum, count) => sum + count, 0);
  return {
    series,
    direction: current > previous ? 'up' : current < previous ? 'down' : 'stable',
    changePercent: previous ? Math.round(((current - previous) / previous) * 100) : null,
    comparison: { current, previous, delta: current - previous },
  };
};
