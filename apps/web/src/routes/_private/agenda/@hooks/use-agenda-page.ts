import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { type CompromissoRecord, compromissosQuery } from '@/query/compromisso.js';
import { type PrazoRecord, prazosPendentesQuery } from '@/query/prazo.js';
import { ALL_FILTER_VALUE, DEFAULT_VIEW } from '../@consts/calendar.js';
import type { CalendarSearch, CalendarView, PanelState } from '../@interface/calendar.interface.js';
import { rangeForView, shiftDate } from '../@utils/calendar-navigation.js';

export function useAgendaPage() {
  const search = useSearch({ strict: false }) as CalendarSearch;
  const navigate = useNavigate();
  const [panel, setPanel] = useState<PanelState>(search.periciaId ? { kind: 'create' } : null);

  const view = search.view ?? DEFAULT_VIEW;
  const date = search.date ?? formatDisplayDate(new Date());
  const { from, to } = rangeForView(view, date);
  const query = useQuery(compromissosQuery({ from, to, tipo: search.tipo }));
  // Prazos pendentes do intervalo (AD-109); somem quando o filtro é um tipo de compromisso.
  const prazosQuery = useQuery({ ...prazosPendentesQuery({ from, to }), enabled: !search.tipo });
  const prazos = search.tipo ? [] : (prazosQuery.data ?? []);

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
    prazos,
    handleViewChange: (nextView: CalendarView) => updateSearch((prev) => ({ ...prev, view: nextView })),
    handlePrevious: () => updateSearch((prev) => ({ ...prev, date: shiftDate(view, date, -1) })),
    handleNext: () => updateSearch((prev) => ({ ...prev, date: shiftDate(view, date, 1) })),
    handleToday: () => updateSearch((prev) => ({ ...prev, date: formatDisplayDate(new Date()) })),
    handleTipoChange: (value: string | null) =>
      updateSearch((prev) => ({
        ...prev,
        tipo: !value || value === ALL_FILTER_VALUE ? undefined : (value as CalendarSearch['tipo']),
      })),
    handleSelectItem: (compromisso: CompromissoRecord) => setPanel({ kind: 'detail', compromisso }),
    handleSelectPrazo: (prazo: PrazoRecord) => setPanel({ kind: 'prazo', prazo }),
    closePanel: () => {
      setPanel(null);
      if (search.periciaId) updateSearch((prev) => ({ ...prev, periciaId: undefined }));
    },
    clearFilters: () => updateSearch((prev) => ({ ...prev, tipo: undefined })),
  };
}
