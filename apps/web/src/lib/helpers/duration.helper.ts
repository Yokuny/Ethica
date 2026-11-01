import { t } from './translate.helper.js';

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
// A unit proportional to the duration, keeping sub-minute minutes.
export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return t('unavailable');
  const minute = 60_000,
    hour = 60 * minute,
    day = 24 * hour;
  const [value, one, many]: [number, string, string] =
    milliseconds >= day
      ? [milliseconds / day, t('day_unit'), t('days')]
      : milliseconds >= hour
        ? [milliseconds / hour, t('hour'), t('hours')]
        : [milliseconds / minute, t('minute'), t('minutes')];
  // The singular follows the displayed number (1 decimal), not exact equality.
  return `${number.format(value)} ${Math.round(value * 10) / 10 === 1 ? one : many}`;
}
