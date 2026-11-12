import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { type ChartConfig, ChartContainer } from '@ethica/ui/components/chart';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ChevronRight, ListFilter, Search } from 'lucide-react';
import { Bar, BarChart } from 'recharts';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10 (AD-220): pieces of the product with made-up data, beside the sign-in. Illustration only:
// hidden from screen readers and from the keyboard.

const FILTERS = [
  { label: t('control_number') },
  { label: t('service_phase'), value: '3' },
  { label: t('status'), value: t('suspended') },
  { label: t('sphere'), value: t('labor_court') },
  { label: t('service_type') },
  { label: t('delivery_period') },
];

const EVENTS = [
  { time: '08:30', title: t('sample_inspection_title'), kind: t('inspection') },
  { time: '13:00', title: t('sample_hearing_title'), kind: t('hearing') },
  { time: '16:30', title: t('sample_meeting_title'), kind: t('meeting') },
];

// Stops of the route on a 320×180 drawing: street grid, path and numbered pins.
// The filter menu covers the right side of the drawing, so the route stays on the left.
const STOPS = [
  { x: 32, y: 120 },
  { x: 96, y: 52 },
  { x: 168, y: 92 },
];
const STREETS = [36, 84, 132].map((y) => `M0 ${y}H320`).concat([56, 128, 200, 272].map((x) => `M${x} 0V180`));
const ROUTE = 'M32 120H56V84H96V52H128V92H168';

// Fees received in the last six months.
const FEES = [820_000, 1_240_000, 960_000, 1_580_000, 1_310_000, 1_890_000].map((receivedCents, month) => ({
  month,
  receivedCents,
}));
const FEES_TOTAL = FEES.reduce((total, fee) => total + fee.receivedCents, 0);
const chartConfig = { receivedCents: { label: t('received'), color: 'var(--chart-1)' } } satisfies ChartConfig;

function RouteMap() {
  return (
    <Item className="flex-col flex-nowrap items-stretch gap-3 p-4">
      <ItemContent>
        <ItemTitle>{t('sample_route_title')}</ItemTitle>
        <ItemDescription>{t('sample_route_description')}</ItemDescription>
      </ItemContent>
      <svg viewBox="0 0 320 180" className="aspect-video w-full" role="presentation">
        <path d={STREETS.join('')} stroke="var(--border)" strokeWidth="10" fill="none" />
        <path d={ROUTE} stroke="var(--primary)" strokeWidth="4" fill="none" strokeLinejoin="round" />
        {STOPS.map((stop, index) => (
          <g key={stop.x}>
            <circle cx={stop.x} cy={stop.y} r="12" fill="var(--primary)" />
            <text
              x={stop.x}
              y={stop.y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="var(--primary-foreground)"
            >
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
    </Item>
  );
}

function FilterMenu() {
  return (
    <Item className="flex-col flex-nowrap items-stretch gap-1 p-1">
      <div className="flex items-center gap-2 p-1">
        <Button variant="secondary">
          <ListFilter />
          {t('filters')}
          <Badge variant="outline">3</Badge>
        </Button>
        <Search aria-hidden className="size-4 text-muted-foreground" />
        <ItemDescription>{t('search')}</ItemDescription>
      </div>
      {FILTERS.map((filter) => (
        <div key={filter.label} className="flex items-center gap-2 px-2 py-1.5">
          <ItemTitle className="flex-1 truncate font-normal">{filter.label}</ItemTitle>
          {filter.value && <ItemDescription>{filter.value}</ItemDescription>}
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </div>
      ))}
    </Item>
  );
}

function AgendaCard() {
  return (
    <Item className="flex-col flex-nowrap items-stretch gap-3 p-4">
      <ItemTitle>
        {t('agenda')} · {t('today')}
      </ItemTitle>
      {EVENTS.map((event) => (
        <div key={event.time} className="flex items-center gap-3">
          <ItemDescription className="w-10 shrink-0 tabular-nums">{event.time}</ItemDescription>
          <ItemTitle className="block min-w-0 flex-1 truncate font-normal">{event.title}</ItemTitle>
          <Badge variant="secondary">{event.kind}</Badge>
        </div>
      ))}
    </Item>
  );
}

function FeesCard() {
  return (
    <Item className="flex-col flex-nowrap items-stretch gap-3 p-4">
      <ItemContent>
        <ItemDescription>{t('fees_received')}</ItemDescription>
        <ItemTitle className="text-2xl tabular-nums">{formatMoney(FEES_TOTAL)}</ItemTitle>
      </ItemContent>
      <ChartContainer config={chartConfig} className="aspect-auto h-24 w-full">
        <BarChart data={FEES} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <Bar
            dataKey="receivedCents"
            fill="var(--color-receivedCents)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </Item>
  );
}

// Like a hero picture with cards over it: the route map in the back, the filters on its top right
// corner, and the agenda and the fees over its bottom edge.
export function AuthShowcase() {
  return (
    <div aria-hidden inert className="relative hidden w-full select-none py-8 lg:block">
      <div className="pr-16">
        <RouteMap />
      </div>
      <div className="absolute top-0 right-0 z-10 w-64">
        <FilterMenu />
      </div>
      <div className="relative z-10 -mt-14 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4 pl-6">
        <AgendaCard />
        <FeesCard />
      </div>
    </div>
  );
}
