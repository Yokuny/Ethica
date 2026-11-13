import { Item, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { RadioGroup, RadioGroupItem } from '@ethica/ui/components/radio-group';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: the field route of the day (start + 3 inspections) and its travel cost split among the
// service orders of the route, as in field/@components/travel-cost.tsx.

const FUEL_CENTS = 6_450;
const TOLLS_CENTS = 1_840;
const TOTAL_CENTS = FUEL_CENTS + TOLLS_CENTS;
const ORDERS = ['OS-0142', 'OS-0139', 'OS-0127'];

const START = { x: 40, y: 150 };
const STOPS = [
  { x: 150, y: 96, label: t('sample_stop_factory') },
  { x: 290, y: 56, label: t('sample_stop_warehouse') },
  { x: 400, y: 122, label: t('sample_stop_building') },
];
const ROUTE = 'M40 150 L40 130 L120 130 L150 96 L220 96 L220 56 L370 56 L370 122 L400 122';
const BLOCKS = [0, 1, 2, 3, 4, 5].flatMap((column) =>
  [0, 1, 2].map((row) => ({ x: 8 + column * 80, y: 6 + row * 58, key: `${column}-${row}` })),
);

function RouteMap() {
  return (
    <svg viewBox="0 0 480 176" className="w-full" role="presentation">
      <rect width="480" height="176" className="fill-muted/60" />
      {BLOCKS.map((block) => (
        <rect key={block.key} x={block.x} y={block.y} width="64" height="44" rx="3" className="fill-background" />
      ))}
      <rect x="168" y="122" width="144" height="44" rx="3" className="fill-emerald-50" />
      <path d="M0 26 C120 8 200 40 300 22 S440 0 480 14" className="fill-none stroke-sky-100" strokeWidth="8" />
      <path d={ROUTE} className="fill-none stroke-foreground/70" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={START.x} cy={START.y} r="5" className="fill-background stroke-foreground/70" strokeWidth="2" />
      {STOPS.map((stop, index) => (
        <g key={stop.label}>
          <circle cx={stop.x} cy={stop.y} r="8" className="fill-foreground/80" />
          <text x={stop.x} y={stop.y + 3} textAnchor="middle" fontSize="9" className="fill-background">
            {index + 1}
          </text>
          <text
            x={stop.x}
            y={stop.y - 13}
            textAnchor="middle"
            fontSize="9"
            className="fill-muted-foreground stroke-background"
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
    <div className="flex h-full flex-col gap-4">
      <RouteMap />
      <div className="flex flex-col gap-3 px-4">
        <ItemDescription className="text-[11px] tabular-nums">
          86 km · 1h52 · {t('fuel')} {formatMoney(FUEL_CENTS)} · {t('tolls_on_route')} {formatMoney(TOLLS_CENTS)}
        </ItemDescription>
        <RadioGroup value="split" className="gap-2">
          <Item size="xs" className="shadow-none">
            <RadioGroupItem value="one" />
            <ItemContent>
              <ItemTitle className="font-normal text-xs">{t('in_one_service_order')}</ItemTitle>
            </ItemContent>
            <ItemDescription className="text-xs tabular-nums">{formatMoney(TOTAL_CENTS)}</ItemDescription>
          </Item>
          <Item size="xs" className="shadow-none border-foreground/30">
            <RadioGroupItem value="split" />
            <ItemContent>
              <ItemTitle className="font-normal text-xs">{t('split_among_service_orders')}</ItemTitle>
              <ItemDescription className="text-[11px] font-mono">{ORDERS.join(', ')}</ItemDescription>
            </ItemContent>
            <ItemDescription className="text-xs tabular-nums">
              {formatMoney(Math.round(TOTAL_CENTS / ORDERS.length))} {t('per_service_order')}
            </ItemDescription>
          </Item>
        </RadioGroup>
      </div>
    </div>
  );
}
