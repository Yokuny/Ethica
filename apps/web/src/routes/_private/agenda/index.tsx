import { Button } from '@ethica/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AppointmentDetail } from './@components/appointment-detail.js';
import { AppointmentForm } from './@components/appointment-form.js';
import { CalendarActions, CalendarToolbar } from './@components/calendar-toolbar.js';
import { DeadlineEntryDialog } from './@components/deadline-entry-dialog.js';
import { MonthView } from './@components/month-view.js';
import { TimeGridView } from './@components/time-grid-view.js';
import { useAgendaPage } from './@hooks/use-agenda-page.js';
import { type CalendarSearch, calendarSearchSchema } from './@interface/calendar.interface.js';

export function AgendaIndexPage() {
  const state = useAgendaPage();
  const {
    panel,
    setPanel,
    search,
    closePanel,
    query,
    items,
    entries,
    view,
    date,
    from,
    handleSelectItem,
    handleSelectEntry,
    clearFilters,
  } = state;
  const entryProps = { entries, onSelectEntry: handleSelectEntry, today: formatDisplayDate(new Date()) };

  return (
    <Card asPage>
      <CardHeader title={t('agenda')} description={t('inspections_hearings_and_deadlines_in_one_calendar')}>
        <CalendarActions state={state} />
      </CardHeader>
      <CardContent>
        <CalendarToolbar state={state} />
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
        ) : !items.length && !entries.length && search.type ? (
          <DefaultEmptyData
            title={t('nothing_scheduled_in_period')}
            action={<Button onClick={clearFilters}>{t('clear_filters')}</Button>}
          />
        ) : view === 'month' ? (
          <MonthView month={date} items={items} onSelect={handleSelectItem} {...entryProps} />
        ) : (
          <TimeGridView
            days={view === 'day' ? [date] : Array.from({ length: 7 }, (_, index) => addDaysToDisplayDate(from, index))}
            items={items}
            onSelect={handleSelectItem}
            {...entryProps}
          />
        )}
      </CardContent>
      {panel?.kind === 'create' && <AppointmentForm date={panel.date} caseId={search.caseId} onClose={closePanel} />}
      {panel?.kind === 'edit' && <AppointmentForm appointment={panel.appointment} onClose={closePanel} />}
      {panel?.kind === 'detail' && (
        <AppointmentDetail
          appointment={panel.appointment}
          onEdit={() => setPanel({ kind: 'edit', appointment: panel.appointment })}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'deadline' && <DeadlineEntryDialog entry={panel.entry} onClose={closePanel} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/agenda/')({
  component: AgendaIndexPage,
  staticData: { title: t('agenda') },
  validateSearch: (search: Record<string, unknown>): CalendarSearch => calendarSearchSchema.parse(search),
});
