import { Button } from '@ethica/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PrazoDialog } from '@/components/prazo-dialog.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CalendarToolbar } from './@components/calendar-toolbar.js';
import { CompromissoDetail } from './@components/compromisso-detail.js';
import { CompromissoForm } from './@components/compromisso-form.js';
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
    prazos,
    view,
    date,
    from,
    handleSelectItem,
    handleSelectPrazo,
    clearFilters,
  } = state;
  const items = query.data ?? [];
  const prazoProps = { prazos, onSelectPrazo: handleSelectPrazo, today: formatDisplayDate(new Date()) };

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
          <MonthView month={date} items={items} onSelect={handleSelectItem} {...prazoProps} />
        ) : (
          <TimeGridView
            days={view === 'day' ? [date] : Array.from({ length: 7 }, (_, index) => addDaysToDisplayDate(from, index))}
            items={items}
            onSelect={handleSelectItem}
            {...prazoProps}
          />
        )}
      </CardContent>
      {panel?.kind === 'create' && (
        <CompromissoForm date={panel.date} periciaId={search.periciaId} onClose={closePanel} />
      )}
      {panel?.kind === 'edit' && <CompromissoForm compromisso={panel.compromisso} onClose={closePanel} />}
      {panel?.kind === 'detail' && (
        <CompromissoDetail
          compromisso={panel.compromisso}
          onEdit={() => setPanel({ kind: 'edit', compromisso: panel.compromisso })}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'prazo' && <PrazoDialog prazo={panel.prazo} onClose={closePanel} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/agenda/')({
  component: AgendaIndexPage,
  staticData: { title: t('agenda') },
  validateSearch: (search: Record<string, unknown>): CalendarSearch => calendarSearchSchema.parse(search),
});
