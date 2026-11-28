import type { TrackedCase, TrackedCaseStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// A case in court as the perita reads it (PAC-02); the API says the situation, `stale` included (PAT-03).
export const TRACKED_CASE_VARIANT = {
  not_found: 'warning',
  stale: 'error',
  waiting: 'info',
  synced: 'success',
} as const satisfies Record<TrackedCaseStatus, IndicatorVariant>;

const LABEL_KEY = {
  not_found: 'court_query_not_found',
  stale: 'court_query_stale',
  waiting: 'court_query_waiting',
  synced: 'court_query_synced',
} as const satisfies Record<TrackedCaseStatus, string>;

export const trackedCaseLabel = (status: TrackedCaseStatus): string => t(LABEL_KEY[status]);

// What the perita can do in each situation: wait, check the number, or nothing.
export const trackedCaseDescription = (item: Pick<TrackedCase, 'syncedAt' | 'status'>): string => {
  const date = item.syncedAt ? formatDate(new Date(item.syncedAt)) : '';
  if (item.status === 'waiting') return t('court_process_waiting');
  if (item.status === 'stale') return `${t('court_query_stale_since')} ${date}`;
  if (item.status === 'not_found') return `${t('last_court_query')} ${date}. ${t('court_query_not_found_description')}`;
  return `${t('last_court_query')} ${date}`;
};
