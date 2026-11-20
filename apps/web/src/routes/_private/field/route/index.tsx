import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { FieldConnection } from '../@components/field-connection.js';
import { FieldState } from '../@components/field-state.js';
import { RangeNav } from '../@components/range-nav.js';
import { useFieldRange } from '../@hooks/use-field-range.js';
import { type FieldSearch, fieldSearchSchema } from '../@interface/field.interface.js';
import { FieldRoute } from './@components/field-route.js';

// Route planning of the range (AD-239, LOG-04).
export function FieldRoutePage() {
  const { from, to, update, query, items } = useFieldRange();

  return (
    <Card asPage>
      <CardHeader title={t('route_planning')} />
      <CardContent className="gap-4">
        <RangeNav from={from} to={to} onChange={update} />
        <FieldConnection ofDevice={query.data?.ofDevice} />
        <FieldState query={query}>
          <FieldRoute key={`${from}_${to}`} data={items} withDate={from !== to} />
        </FieldState>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/route/')({
  component: FieldRoutePage,
  staticData: { title: t('route_planning') },
  validateSearch: (search: Record<string, unknown>): FieldSearch => fieldSearchSchema.parse(search),
});
