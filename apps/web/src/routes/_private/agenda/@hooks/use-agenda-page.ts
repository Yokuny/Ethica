import { APPOINTMENT_TYPES, type AppointmentType, type CalendarEntryType } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { type AppointmentRecord, appointmentsQuery } from '@/query/appointment.js';
import { type CalendarEntryRecord, calendarEntriesQuery } from '@/query/calendar-entry.js';
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
  // The filter is an appointment type or an all-day entry type (AD-169): the other side disappears.
  const appointmentType = (APPOINTMENT_TYPES as readonly string[]).includes(search.type ?? '')
    ? (search.type as AppointmentType)
    : undefined;
  const entryType = search.type && !appointmentType ? (search.type as CalendarEntryType) : undefined;
  const query = useQuery({ ...appointmentsQuery({ from, to, type: appointmentType }), enabled: !entryType });
  const entriesQuery = useQuery({ ...calendarEntriesQuery({ from, to, type: entryType }), enabled: !appointmentType });
  const items = entryType ? [] : (query.data ?? []);
  const entries = appointmentType ? [] : (entriesQuery.data ?? []);

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
    items,
    entries,
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
    // A deadline opens the deadline; a finance entry opens the transactions of its case.
    handleSelectEntry: (entry: CalendarEntryRecord) =>
      entry.source === 'deadline'
        ? setPanel({ kind: 'deadline', entry })
        : navigate({ to: '/finance', search: entry.caseId ? { caseId: entry.caseId } : {} }),
    closePanel: () => {
      setPanel(null);
      if (search.caseId) updateSearch((prev) => ({ ...prev, caseId: undefined }));
    },
    clearFilters: () => updateSearch((prev) => ({ ...prev, type: undefined })),
  };
}
