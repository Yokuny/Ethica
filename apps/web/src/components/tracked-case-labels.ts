import type { TrackedCase, TrackedCaseStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// A case in court as the perita reads it (PAC-02): the status the api gives plus `stale`, derived on screen when the
// last successful query is older than 3 days (a weekend with a failed day still fits).
export type TrackedCaseState = TrackedCaseStatus | 'stale';

const STALE_MS = 3 * 86_400_000;

export const trackedCaseState = (item: Pick<TrackedCase, 'status' | 'syncedAt'>, now = Date.now()): TrackedCaseState =>
  item.syncedAt && now - new Date(item.syncedAt).getTime() > STALE_MS ? 'stale' : item.status;

export const TRACKED_CASE_VARIANT = {
  not_found: 'warning',
  stale: 'error',
  waiting: 'info',
  synced: 'success',
} as const satisfies Record<TrackedCaseState, IndicatorVariant>;

const LABEL_KEY = {
  not_found: 'court_query_not_found',
  stale: 'court_query_stale',
  waiting: 'court_query_waiting',
  synced: 'court_query_synced',
} as const satisfies Record<TrackedCaseState, string>;

export const trackedCaseLabel = (state: TrackedCaseState): string => t(LABEL_KEY[state]);

// What the perita can do in each state: wait, check the number, or nothing.
export const trackedCaseDescription = (item: Pick<TrackedCase, 'syncedAt'>, state: TrackedCaseState): string => {
  const date = item.syncedAt ? formatDate(new Date(item.syncedAt)) : '';
  if (state === 'waiting') return t('court_process_waiting');
  if (state === 'stale') return `${t('court_query_stale_since')} ${date}`;
  if (state === 'not_found') return `${t('last_court_query')} ${date}. ${t('court_query_not_found_description')}`;
  return `${t('last_court_query')} ${date}`;
};
