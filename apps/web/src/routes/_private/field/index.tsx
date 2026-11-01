import { Button } from '@ethica/ui/components/button';
import { ItemGroup } from '@ethica/ui/components/item';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Map as MapIcon } from 'lucide-react';
import { useEffect } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { startSync } from '@/lib/offline/sync.js';
import { inspectionDayQuery } from '@/query/inspection.js';
import { FieldCard } from './@components/field-card.js';
import { FieldConnection } from './@components/field-connection.js';
import { useQuickStatus } from './@hooks/use-quick-status.js';
import { type FieldSearch, fieldSearchSchema } from './@interface/field.interface.js';

// Field route of the day (CAM-01), designed for the phone and to work without a connection (AD-128).
export function FieldPage() {
  const search = useSearch({ strict: false }) as FieldSearch;
  const navigate = useNavigate({ from: '/field/' });
  const queryClient = useQueryClient();
  const date = search.date ?? formatDisplayDate(new Date());
  const query = useQuery({ ...inspectionDayQuery(date), networkMode: 'always' });
  const { mark } = useQuickStatus();
  const items = query.data?.items ?? [];

  // The sync listens for the connection coming back: it starts once when the field opens.
  useEffect(() => startSync(queryClient), [queryClient]);

  const goTo = (days: number) => navigate({ search: { date: addDaysToDisplayDate(date, days) }, replace: true });

  return (
    <Card asPage>
      <CardHeader title={t('field')}>
        <CardAction>
          <Button variant="outline" nativeButton={false} render={<Link to="/field/map" search={{ date }} />}>
            <MapIcon />
            {t('day_map')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="max-w-3xl gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label={t('previous_day')} onClick={() => goTo(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => navigate({ search: {}, replace: true })}>
            {formatDate(new Date(`${date}T12:00:00`))}
          </Button>
          <Button variant="outline" size="icon" aria-label={t('next_day')} onClick={() => goTo(1)}>
            <ChevronRight />
          </Button>
        </div>
        <FieldConnection ofDevice={query.data?.ofDevice} />
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
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
