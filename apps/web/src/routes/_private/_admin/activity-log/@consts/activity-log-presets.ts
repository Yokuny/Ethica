import { toCalendarDate } from '@/components/date-picker.js';
import type { ActivityLogSearch } from '../@interface/activityLog.interface.js';

// Ready-made filters of the "…" menu (AD-307): written to the URL, so "Filtros" shows them and "Limpar" removes
// them. A preset changes only its own filters; periods are dates counted from today.
export function activityLogPresets(): { label: string; filters: Partial<ActivityLogSearch> }[] {
  const today = new Date();
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return [
    { label: 'today', filters: { from: toCalendarDate(today), to: toCalendarDate(today) } },
    { label: 'last_7_days', filters: { from: toCalendarDate(weekAgo), to: toCalendarDate(today) } },
    { label: 'deletions', filters: { action: ['delete'] } },
    { label: 'sign_ins', filters: { action: ['signin'] } },
    { label: 'finance', filters: { module: ['finance'] } },
  ];
}
