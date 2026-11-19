import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { t } from '@/lib/helpers/translate.helper.js';

const number = new Intl.NumberFormat('pt-BR');

// Pastel scale, lightest to deepest: the tile's share of the largest one picks the step.
const STEPS = ['bg-status-info/40', 'bg-status-info', 'bg-status-info-border'] as const;
const step = (ratio: number) => STEPS[Math.min(STEPS.length - 1, Math.floor(ratio * STEPS.length))];

type HeatTilesProps = { items: { key: string; label: string; count: number }[] };

// Counts as tinted tiles (heat map): label, number and its share of the total. The scale legend
// (`HeatTilesLegend`) goes in the panel header, opposite the title.
export function HeatTiles({ items }: HeatTilesProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.key} className={cn('flex min-w-0 flex-col gap-3 rounded-md p-4', step(item.count / max))}>
          <ItemDescription className="text-foreground">{item.label}</ItemDescription>
          <div className="flex items-baseline justify-between gap-2">
            <ItemTitle className="text-2xl font-medium tracking-tight text-impact">
              {number.format(item.count)}
            </ItemTitle>
            <ItemDescription className="text-xs">{`${Math.round((item.count / (total || 1)) * 100)}%`}</ItemDescription>
          </div>
        </div>
      ))}
    </div>
  );
}

// Balance is read by a rule (its sign), not by the scale: positive, negative or zero.
const BALANCE = { positive: 'bg-status-success/70', negative: 'bg-status-error', zero: 'bg-muted/60' } as const;

type HeatCellProps = { value: string; change?: string } & (
  | { ratio: number; balance?: never }
  | { balance: keyof typeof BALANCE; ratio?: never }
);

// One cell of a heat table: the value with its change beside it, tinted by the scale (`ratio` of the column's
// largest) or by the balance rule. Zero stays without tint.
export function HeatCell({ value, change, ratio, balance }: HeatCellProps) {
  const tone = balance ? BALANCE[balance] : ratio ? step(ratio) : BALANCE.zero;
  return (
    <div className={cn('flex min-w-0 items-baseline justify-between gap-3 rounded-md px-3 py-2.5', tone)}>
      <ItemTitle className="font-medium whitespace-nowrap tabular-nums text-impact">{value}</ItemTitle>
      {change && <ItemDescription className="text-xs whitespace-nowrap tabular-nums">{change}</ItemDescription>}
    </div>
  );
}

export function HeatTilesLegend() {
  return (
    <div aria-hidden className="flex items-center gap-2">
      <ItemDescription className="text-xs">{t('less')}</ItemDescription>
      {STEPS.map((tone) => (
        <span key={tone} className={cn('h-2 w-5 rounded-full', tone)} />
      ))}
      <ItemDescription className="text-xs">{t('more')}</ItemDescription>
    </div>
  );
}
