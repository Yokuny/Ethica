import { Button } from '@ethica/ui/components/button';
import { ButtonGroup } from '@ethica/ui/components/button-group';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APPOINTMENT_TYPE_ITEMS } from '@/components/appointment-labels.js';
import { calendarEntryTypeItems } from '@/components/calendar-entry-labels.js';
import { TableFilterSelect, TableFilters } from '@/components/data-table.js';
import { CardAction } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { CALENDAR_VIEWS } from '../@consts/calendar.js';
import type { useAgendaPage } from '../@hooks/use-agenda-page.js';

// "Nov" and "2026" apart: the month big, the year smaller beside it.
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const yearName = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', timeZone: 'UTC' });
const VIEW_ITEMS = CALENDAR_VIEWS.map((value) => ({ value, label: t(value) }));

type AgendaState = { state: ReturnType<typeof useAgendaPage> };

// Header actions: period navigation, the view (day/week/month) and the new commitment (the page's primary action).
export function CalendarActions({ state }: AgendaState) {
  const { date, view, setPanel, handlePrevious, handleNext, handleToday, handleViewChange } = state;
  return (
    <CardAction>
      <ButtonGroup>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('previous')}
          title={t('previous')}
          onClick={handlePrevious}
        >
          <ChevronLeft />
        </Button>
        <Button type="button" variant="outline" onClick={handleToday}>
          {t('today')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('next')}
          title={t('next')}
          onClick={handleNext}
        >
          <ChevronRight />
        </Button>
      </ButtonGroup>
      <Select items={VIEW_ITEMS} value={view} onValueChange={(next) => next && handleViewChange(next)}>
        <SelectTrigger size="compact" aria-label={t('view')} className="w-28">
          <SelectValue placeholder={t('view')} />
        </SelectTrigger>
        <SelectContent>
          {VIEW_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" onClick={() => setPanel({ kind: 'create', date })}>
        {t('new_commitment')}
      </Button>
    </CardAction>
  );
}

// Above the calendar: the period being shown and the "Filtros" with the type.
export function CalendarToolbar({ state }: AgendaState) {
  const { date, search, handleTypeChange } = state;
  const { data: session } = useQuery(sessionQuery);
  // Appointment types and the all-day entry types; finance only for whoever sees finance (AD-137).
  const typeItems = [...APPOINTMENT_TYPE_ITEMS, ...calendarEntryTypeItems(Boolean(session && can(session, 'finance')))];
  const day = new Date(`${date}T12:00:00Z`);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-baseline gap-1.5">
        <ItemTitle className="text-2xl font-semibold first-letter:uppercase">
          {monthName.format(day).replace('.', '')}
        </ItemTitle>
        <ItemDescription className="text-base">{yearName.format(day)}</ItemDescription>
      </div>
      <TableFilters
        active={search.type ? 1 : 0}
        content={
          <TableFilterSelect label={t('type')} items={typeItems} value={search.type} onChange={handleTypeChange} />
        }
      />
    </div>
  );
}
