import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { APPOINTMENT_TYPE_ITEMS } from '@/components/appointment-labels.js';
import { calendarEntryTypeItems } from '@/components/calendar-entry-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PeriodNav } from '@/components/period-nav.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import { can, sessionQuery } from '@/query/session.js';
import { AppointmentDetail } from './@components/appointment-detail.js';
import { AppointmentForm } from './@components/appointment-form.js';
import { MonthView } from './@components/month-view.js';
import { NotificationEntryDialog } from './@components/notification-entry-dialog.js';
import { TimeGridView } from './@components/time-grid-view.js';
import { ALL_FILTER_VALUE, CALENDAR_VIEWS, TYPE_COLORS } from './@consts/calendar.js';
import { useAgendaPage } from './@hooks/use-agenda-page.js';
import { type CalendarSearch, calendarSearchSchema } from './@interface/calendar.interface.js';

// "15 domingo" big and "novembro 2026" smaller beside it.
const weekdayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });
const monthYearName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const VIEW_ITEMS = CALENDAR_VIEWS.map((value) => ({ value, label: t(value) }));

export function AgendaIndexPage() {
  const {
    panel,
    setPanel,
    search,
    closePanel,
    isLoading,
    isError,
    refetch,
    items,
    entries,
    view,
    date,
    from,
    handleSelectItem,
    handleSelectEntry,
    handleViewChange,
    handleTypeChange,
    handlePrevious,
    handleNext,
    handleToday,
    clearFilters,
  } = useAgendaPage();
  const session = useQuery(sessionQuery).data;
  // Appointment types and the all-day entry types; finance only for whoever sees finance (AD-137).
  const typeItems = [
    { value: ALL_FILTER_VALUE, label: t('all_types') },
    ...APPOINTMENT_TYPE_ITEMS,
    ...calendarEntryTypeItems(Boolean(session && can(session, 'finance'))),
  ];
  const day = new Date(`${date}T12:00:00Z`);
  const entryProps = {
    entries,
    onSelectEntry: handleSelectEntry,
    onCreate: (day: string) => setPanel({ kind: 'create', date: day }),
    today: formatDisplayDate(new Date()),
  };

  return (
    <Card asPage>
      <CardHeader title={t('agenda')} description={t('inspections_hearings_and_deadlines_in_one_calendar')}>
        {/* The view (day/week/month) and the new commitment, the page's primary action. */}
        <CardAction>
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
      </CardHeader>
      <CardContent>
        {/* The day shown, big, and on its right the type filter (its dots are the color legend) and the period navigation. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <ItemTitle className="text-2xl text-impact">
              {Number(date.slice(-2))} {weekdayName.format(day)}
            </ItemTitle>
            <ItemDescription className="line-clamp-none text-base">{monthYearName.format(day)}</ItemDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select items={typeItems} value={search.type ?? ALL_FILTER_VALUE} onValueChange={handleTypeChange}>
              <SelectTrigger size="compact" aria-label={t('type')}>
                <SelectValue placeholder={t('type')} />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value !== ALL_FILTER_VALUE && (
                      <span
                        className={cn('size-2 rounded-full', TYPE_COLORS[item.value as keyof typeof TYPE_COLORS].dot)}
                      />
                    )}
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PeriodNav
              label={t('today')}
              previousLabel={t('previous')}
              nextLabel={t('next')}
              onPrevious={handlePrevious}
              onToday={handleToday}
              onNext={handleNext}
            />
          </div>
        </div>
        {isLoading ? (
          <DefaultLoading />
        ) : isError ? (
          <DefaultEmptyData title={t('load_error')} action={<Button onClick={refetch}>{t('try_again')}</Button>} />
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
      {panel?.kind === 'deadline' && <NotificationEntryDialog entry={panel.entry} onClose={closePanel} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/agenda/')({
  component: AgendaIndexPage,
  staticData: { title: t('agenda') },
  validateSearch: (search: Record<string, unknown>): CalendarSearch => calendarSearchSchema.parse(search),
});
