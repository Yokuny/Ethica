import { type ListStats, listStatsSchema } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Listing overview endpoints (GET .../stats): total and count per group.
type StatsPath = '/expert-cases/stats' | '/prospecting/opportunities/stats';

export const listStatsQuery = (path: StatsPath) =>
  queryOptions({
    queryKey: ['list-stats', path] as const,
    queryFn: async (): Promise<ListStats> => {
      const res = await get<ListStats>(path);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return listStatsSchema.parse(res.data);
    },
  });

// Count of a group; `undefined` while the overview has not loaded.
export const statCount = (stats: ListStats | undefined, key: string): number | undefined =>
  stats ? (stats.groups.find((group) => group.key === key)?.count ?? 0) : undefined;
