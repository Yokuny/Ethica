import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { DayStrip } from '../@components/day-strip.js';
import { FieldConnection } from '../@components/field-connection.js';
import { FieldState } from '../@components/field-state.js';
import { RangePicker } from '../@components/range-picker.js';
import { useFieldRange } from '../@hooks/use-field-range.js';
import { type FieldSearch, fieldSearchSchema } from '../@interface/field.interface.js';
import { rangeLabel } from '../@utils/range.js';
import { FieldCard } from './@components/field-card.js';
import { useQuickStatus } from './@hooks/use-quick-status.js';

// Scheduled services of the range (AD-239, LOG-05), designed for the phone (AD-195): the days side by side on top
// (AD-242), the range on the left, fixed on large screens, and the appointments as rows on the right.
export function FieldInspectionsPage() {
  const { from, to, update, query, items } = useFieldRange();
  const { mark } = useQuickStatus();

  return (
    <Card asPage>
      <CardHeader title={t('scheduled_services')}>
        <CardAction>
          <RangePicker from={from} to={to} onChange={update} />
        </CardAction>
      </CardHeader>
      <CardContent className="gap-6">
        <DayStrip from={from} to={to} onChange={update} />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-6 lg:gap-16">
          <div className="flex h-fit flex-col gap-5 lg:sticky lg:top-6 lg:col-span-2">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <ItemTitle
                // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                render={<h2 />}
                className="font-medium text-4xl tracking-tight lg:text-5xl"
              >
                {rangeLabel(from, to)}
              </ItemTitle>
              <ItemDescription className="pt-1 text-sm">
                {`${items.length} ${t(items.length === 1 ? 'commitment' : 'commitments').toLowerCase()}`}
              </ItemDescription>
            </div>
            <ItemDescription className="line-clamp-none text-base">{t('field_day_empty_description')}</ItemDescription>
            <FieldConnection ofDevice={query.data?.ofDevice} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <FieldState query={query}>
              {items.length ? (
                <ul>
                  {items.map((item) => (
                    <FieldCard
                      key={item.appointment.id}
                      item={item}
                      withDate={from !== to}
                      onStatus={(status, reason) => void mark(item.appointment.id, status, reason)}
                    />
                  ))}
                </ul>
              ) : (
                <DefaultEmptyData title={t('nothing_scheduled_in_period')} />
              )}
            </FieldState>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/inspections/')({
  component: FieldInspectionsPage,
  staticData: { title: t('scheduled_services') },
  validateSearch: (search: Record<string, unknown>): FieldSearch => fieldSearchSchema.parse(search),
});
