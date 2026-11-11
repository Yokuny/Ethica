import type { ActivityLogAction, ActivityLogModule } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ActivityLogSearch } from '../@interface/activityLog.interface.js';

// Mirrors ActivityRecord of apps/api/src/modules/identity/activityLog.schema.ts (AD-134).
export type Activity = {
  id: string;
  userId: string;
  userName: string;
  module: ActivityLogModule;
  resource?: string;
  action: ActivityLogAction;
  recordId?: string;
  label?: string;
  createdAt: string;
};

export const activityLogQuery = (search: ActivityLogSearch) =>
  queryOptions({
    queryKey: ['activityLog', search] as const,
    queryFn: async (): Promise<{ items: Activity[]; total: number }> => {
      // A list filter repeats the key (`module=a&module=b`, FIL-03).
      const params = new URLSearchParams(
        Object.entries(search).flatMap(([key, value]) =>
          [value ?? []].flat().flatMap((item) => (item === '' ? [] : [[key, String(item)]])),
        ),
      );
      const res = await get<{ items: Activity[]; total: number }>(`/tenant/activity-log?${params}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });
