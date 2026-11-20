import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { startSync } from '@/lib/offline/sync.js';
import { inspectionPeriodQuery } from '@/query/inspection.js';
import type { FieldSearch } from '../@interface/field.interface.js';

// Date range of the logistics pages (AD-239): `from`/`to` in the URL (without them, today), every appointment of the
// range, with the device copy when there is no connection (AD-128). The sync starts once when the page opens.
export function useFieldRange() {
  const search = useSearch({ strict: false }) as FieldSearch;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = formatDisplayDate(new Date());
  const from = search.from ?? today;
  const to = search.to && search.to >= from ? search.to : from;
  const query = useQuery({ ...inspectionPeriodQuery({ from, to }), networkMode: 'always' });

  useEffect(() => startSync(queryClient), [queryClient]);

  function update(patch: Partial<FieldSearch>) {
    navigate({ to: '.', search: (prev: FieldSearch) => ({ ...prev, ...patch }), replace: true });
  }

  return { from, to, focus: search.focus, update, query, items: query.data?.items ?? [] };
}
