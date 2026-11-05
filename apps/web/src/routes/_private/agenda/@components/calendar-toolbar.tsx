import { Button } from '@ethica/ui/components/button';
import { ButtonGroup } from '@ethica/ui/components/button-group';
import { ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APPOINTMENT_TYPE_ITEMS } from '@/components/appointment-labels.js';
import { calendarEntryTypeItems } from '@/components/calendar-entry-labels.js';
import { CardAction } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { ALL_FILTER_VALUE, CALENDAR_VIEWS } from '../@consts/calendar.js';
import type { useAgendaPage } from '../@hooks/use-agenda-page.js';

const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

type AgendaState = { state: ReturnType<typeof useAgendaPage> };

// Header actions: period navigation and the new commitment (the page's primary action).
export function CalendarActions({ state }: AgendaState) {
  const { date, setPanel, handlePrevious, handleNext, handleToday } = state;
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
      <Button type="button" onClick={() => setPanel({ kind: 'create', date })}>
        {t('new_commitment')}
      </Button>
    </CardAction>
  );
}

// View switch (day/week/month): a direct child of CardHeader, full width below the title.
export function CalendarViewToggle({ state }: AgendaState) {
  const { view, handleViewChange } = state;
  return (
    <ToggleGroup aria-label={t('view')} value={view} onValueChange={(value) => handleViewChange(value as typeof view)}>
      {CALENDAR_VIEWS.map((viewOption) => (
        <ToggleGroupItem key={viewOption} value={viewOption}>
          {t(viewOption)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// Above the calendar: the period being shown and the type filter.
export function CalendarToolbar({ state }: AgendaState) {
  const { date, search, handleTypeChange } = state;
  const { data: session } = useQuery(sessionQuery);
  // Appointment types and the all-day entry types; finance only for whoever sees finance (AD-137).
  const typeItems = [
    { value: ALL_FILTER_VALUE, label: t('all_types') },
    ...APPOINTMENT_TYPE_ITEMS,
    ...calendarEntryTypeItems(Boolean(session && can(session, 'finance'))),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ItemTitle className="first-letter:uppercase">{monthTitle.format(new Date(`${date}T12:00:00Z`))}</ItemTitle>
      <Select items={typeItems} value={search.type ?? ALL_FILTER_VALUE} onValueChange={handleTypeChange}>
        <SelectTrigger size="compact">
          <SelectValue placeholder={t('type')} />
        </SelectTrigger>
        <SelectContent>
          {typeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
