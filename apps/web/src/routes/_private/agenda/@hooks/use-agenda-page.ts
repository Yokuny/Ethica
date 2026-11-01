import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { type AppointmentRecord, appointmentsQuery } from '@/query/appointment.js';
import { type DeadlineRecord, pendingDeadlinesQuery } from '@/query/deadline.js';
import { ALL_FILTER_VALUE, DEFAULT_VIEW } from '../@consts/calendar.js';
import type { CalendarSearch, CalendarView, PanelState } from '../@interface/calendar.interface.js';
import { rangeForView, shiftDate } from '../@utils/calendar-navigation.js';

export function useAgendaPage() {
  const search = useSearch({ strict: false }) as CalendarSearch;
  const navigate = useNavigate();
  const [panel, setPanel] = useState<PanelState>(search.caseId ? { kind: 'create' } : null);

  const view = search.view ?? DEFAULT_VIEW;
  const date = search.date ?? formatDisplayDate(new Date());
  const { from, to } = rangeForView(view, date);
  const query = useQuery(appointmentsQuery({ from, to, type: search.type }));
  // Pending deadlines in the range (AD-109); they disappear when the filter is an appointment type.
  const deadlinesQuery = useQuery({ ...pendingDeadlinesQuery({ from, to }), enabled: !search.type });
  const deadlines = search.type ? [] : (deadlinesQuery.data ?? []);

  const updateSearch = (patch: (prev: CalendarSearch) => CalendarSearch) => {
    navigate({ to: '/agenda', search: patch, replace: true });
  };

  return {
    search,
    panel,
    setPanel,
    view,
    date,
    from,
    query,
    deadlines,
    handleViewChange: (nextView: CalendarView) => updateSearch((prev) => ({ ...prev, view: nextView })),
    handlePrevious: () => updateSearch((prev) => ({ ...prev, date: shiftDate(view, date, -1) })),
    handleNext: () => updateSearch((prev) => ({ ...prev, date: shiftDate(view, date, 1) })),
    handleToday: () => updateSearch((prev) => ({ ...prev, date: formatDisplayDate(new Date()) })),
    handleTypeChange: (value: string | null) =>
      updateSearch((prev) => ({
        ...prev,
        type: !value || value === ALL_FILTER_VALUE ? undefined : (value as CalendarSearch['type']),
      })),
    handleSelectItem: (appointment: AppointmentRecord) => setPanel({ kind: 'detail', appointment }),
    handleSelectDeadline: (deadline: DeadlineRecord) => setPanel({ kind: 'deadline', deadline }),
    closePanel: () => {
      setPanel(null);
      if (search.caseId) updateSearch((prev) => ({ ...prev, caseId: undefined }));
    },
    clearFilters: () => updateSearch((prev) => ({ ...prev, type: undefined })),
  };
}
