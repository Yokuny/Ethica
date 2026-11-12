import { Button } from '@ethica/ui/components/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { RadioGroup, RadioGroupItem } from '@ethica/ui/components/radio-group';
import { Fuel } from 'lucide-react';
import { Checkbox } from '@/components/checkbox.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: the field route of the day (start + 3 inspections) and its travel cost, launched as an
// expense split among the service orders of the route, as in field/@components/travel-cost.tsx.

const FUEL_CENTS = 6_450;
const TOLLS_CENTS = 1_840;
const TOTAL_CENTS = FUEL_CENTS + TOLLS_CENTS;
const ORDERS = ['OS-0142', 'OS-0139', 'OS-0127'];

const START = { x: 40, y: 176 };
const STOPS = [
  { x: 150, y: 108, label: t('sample_stop_factory') },
  { x: 300, y: 64, label: t('sample_stop_warehouse') },
  { x: 400, y: 140, label: t('sample_stop_building') },
];
const ROUTE = 'M40 176 L40 150 L120 150 L150 108 L230 108 L230 64 L300 64 L380 64 L380 140 L400 140';
// City blocks between the streets of a 480×200 drawing.
const BLOCKS = [0, 1, 2, 3, 4, 5].flatMap((column) =>
  [0, 1, 2].map((row) => ({ x: 8 + column * 80, y: 8 + row * 66, key: `${column}-${row}` })),
);

function RouteMap() {
  return (
    <svg viewBox="0 0 480 200" className="w-full" role="presentation">
      <rect width="480" height="200" className="fill-muted" />
      {BLOCKS.map((block) => (
        <rect key={block.key} x={block.x} y={block.y} width="64" height="50" rx="4" className="fill-background" />
      ))}
      <rect x="168" y="140" width="144" height="50" rx="4" className="fill-emerald-100" />
      <path d="M0 30 C120 10 200 46 300 26 S440 0 480 18" className="fill-none stroke-sky-200" strokeWidth="10" />
      <path d={ROUTE} className="fill-none stroke-background" strokeWidth="9" strokeLinejoin="round" />
      <path d={ROUTE} className="fill-none stroke-primary" strokeWidth="5" strokeLinejoin="round" />
      <circle cx={START.x} cy={START.y} r="9" className="fill-background stroke-primary" strokeWidth="4" />
      {STOPS.map((stop, index) => (
        <g key={stop.label}>
          <circle cx={stop.x} cy={stop.y} r="12" className="fill-primary" />
          <text
            x={stop.x}
            y={stop.y + 4}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            className="fill-primary-foreground"
          >
            {index + 1}
          </text>
          <text
            x={stop.x}
            y={stop.y - 18}
            textAnchor="middle"
            fontSize="10"
            fontWeight="500"
            className="fill-foreground stroke-background"
            strokeWidth="3"
            paintOrder="stroke"
          >
            {stop.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ShowcaseRoute() {
  return (
    <Item className="flex-col flex-nowrap items-stretch gap-0 overflow-hidden p-0">
      <RouteMap />
      <div className="flex flex-col gap-4 p-4">
        <ItemTitle className="font-semibold">{t('launch_as_expense')}</ItemTitle>
        <RadioGroup value="split" className="gap-2">
          <Item>
            <RadioGroupItem value="one" />
            <ItemContent>
              <ItemTitle>{t('in_one_service_order')}</ItemTitle>
              <ItemDescription>{t('in_one_service_order_description')}</ItemDescription>
            </ItemContent>
            <ItemTitle className="tabular-nums">{formatMoney(TOTAL_CENTS)}</ItemTitle>
          </Item>
          <Item className="border-primary">
            <RadioGroupItem value="split" />
            <ItemContent>
              <ItemTitle>{t('split_among_service_orders')}</ItemTitle>
              <ItemDescription>{t('split_among_service_orders_description')}</ItemDescription>
              <div className="mt-2 flex flex-wrap gap-4">
                {ORDERS.map((order) => (
                  <Checkbox key={order} checked label={order} labelClassName="normal-case tracking-normal" />
                ))}
              </div>
            </ItemContent>
            <ItemTitle className="tabular-nums">
              {formatMoney(Math.round(TOTAL_CENTS / ORDERS.length))} {t('per_service_order')}
            </ItemTitle>
          </Item>
        </RadioGroup>
        <Button className="self-start">
          <Fuel />
          {t('launch_as_expense')}
        </Button>
        <RecordStats columns={4} className="py-3">
          <RecordStat label={t('total_km')} value="86 km" />
          <RecordStat label={t('driving_time')} value="1h52" />
          <RecordStat label={t('fuel')} value={formatMoney(FUEL_CENTS)} />
          <RecordStat label={t('tolls_on_route')} value={formatMoney(TOLLS_CENTS)} />
        </RecordStats>
      </div>
    </Item>
  );
}
