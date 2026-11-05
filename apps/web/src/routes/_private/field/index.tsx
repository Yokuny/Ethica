import { Button } from '@ethica/ui/components/button';
import { ItemGroup } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PeriodNav } from '@/components/period-nav.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { startSync } from '@/lib/offline/sync.js';
import { inspectionDayQuery } from '@/query/inspection.js';
import { FieldCard } from './@components/field-card.js';
import { FieldConnection } from './@components/field-connection.js';
import { FieldMap } from './@components/field-map.js';
import { useQuickStatus } from './@hooks/use-quick-status.js';
import { FIELD_VIEWS, type FieldSearch, type FieldView, fieldSearchSchema } from './@interface/field.interface.js';

const VIEW_ITEMS = FIELD_VIEWS.map((value) => ({ value, label: t(value) }));

// Field route of the day (CAM-01), designed for the phone and to work without a connection (AD-128). Two views
// (AD-194): the day map, open by default, and the list.
export function FieldPage() {
  const search = useSearch({ strict: false }) as FieldSearch;
  const navigate = useNavigate({ from: '/field/' });
  const queryClient = useQueryClient();
  const date = search.date ?? formatDisplayDate(new Date());
  const view = search.view ?? 'map';
  const query = useQuery({ ...inspectionDayQuery(date), networkMode: 'always' });
  const { mark } = useQuickStatus();
  const items = query.data?.items ?? [];

  // The sync listens for the connection coming back: it starts once when the field opens.
  useEffect(() => startSync(queryClient), [queryClient]);

  function update(patch: Partial<FieldSearch>) {
    navigate({ search: (prev: FieldSearch) => ({ ...prev, ...patch }), replace: true });
  }

  return (
    <Card asPage>
      <CardHeader title={t('field')}>
        <CardAction>
          <Select items={VIEW_ITEMS} value={view} onValueChange={(next) => next && update({ view: next as FieldView })}>
            <SelectTrigger size="compact" aria-label={t('view')} className="w-32">
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
        </CardAction>
      </CardHeader>
      <CardContent className={view === 'list' ? 'max-w-3xl gap-4' : 'gap-4'}>
        <PeriodNav
          label={formatDate(new Date(`${date}T12:00:00`))}
          previousLabel={t('previous_day')}
          nextLabel={t('next_day')}
          onPrevious={() => update({ date: addDaysToDisplayDate(date, -1) })}
          onToday={() => update({ date: undefined })}
          onNext={() => update({ date: addDaysToDisplayDate(date, 1) })}
        />
        <FieldConnection ofDevice={query.data?.ofDevice} />
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
        ) : view === 'map' ? (
          <FieldMap data={items} />
        ) : !items.length ? (
          <DefaultEmptyData title={t('nothing_scheduled_this_day')} description={t('field_day_empty_description')} />
        ) : (
          <ItemGroup variant="list">
            {items.map((item) => (
              <FieldCard
                key={item.appointment.id}
                item={item}
                onStatus={(status, reason) => void mark(item.appointment.id, status, reason)}
              />
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/')({
  component: FieldPage,
  staticData: { title: t('field') },
  validateSearch: (search: Record<string, unknown>): FieldSearch => fieldSearchSchema.parse(search),
});
