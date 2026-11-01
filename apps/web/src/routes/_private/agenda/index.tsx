import { Button } from '@ethica/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { CaseReceipts } from '@/components/case-receipts.js';
import { DeadlineDialog } from '@/components/deadline-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AppointmentDetail } from './@components/appointment-detail.js';
import { AppointmentForm } from './@components/appointment-form.js';
import { CalendarToolbar } from './@components/calendar-toolbar.js';
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
    deadlines,
    view,
    date,
    from,
    handleSelectItem,
    handleSelectDeadline,
    clearFilters,
  } = state;
  const items = query.data ?? [];
  const deadlineProps = { deadlines, onSelectDeadline: handleSelectDeadline, today: formatDisplayDate(new Date()) };

  return (
    <Card asPage>
      <CardHeader title={t('agenda')} description={t('inspections_hearings_and_deadlines_in_one_calendar')} />
      <CardContent>
        <CalendarToolbar state={state} />
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
        ) : !items.length && search.tipo ? (
          <DefaultEmptyData
            title={t('nothing_scheduled_in_period')}
            action={<Button onClick={clearFilters}>{t('clear_filters')}</Button>}
          />
        ) : view === 'month' ? (
          <MonthView month={date} items={items} onSelect={handleSelectItem} {...deadlineProps} />
        ) : (
          <TimeGridView
            days={view === 'day' ? [date] : Array.from({ length: 7 }, (_, index) => addDaysToDisplayDate(from, index))}
            items={items}
            onSelect={handleSelectItem}
            {...deadlineProps}
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
      {panel?.kind === 'deadline' && (
        <DeadlineDialog deadline={panel.deadline} onClose={closePanel}>
          <CaseReceipts caseId={panel.deadline.caseId} />
        </DeadlineDialog>
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/agenda/')({
  component: AgendaIndexPage,
  staticData: { title: t('agenda') },
  validateSearch: (search: Record<string, unknown>): CalendarSearch => calendarSearchSchema.parse(search),
});
