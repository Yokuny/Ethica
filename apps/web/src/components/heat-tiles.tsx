import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { t } from '@/lib/helpers/translate.helper.js';

const number = new Intl.NumberFormat('pt-BR');

// Pastel scale, lightest to deepest: the tile's share of the largest one picks the step.
const STEPS = ['bg-status-info/40', 'bg-status-info', 'bg-status-info-border'] as const;
const step = (ratio: number) => STEPS[Math.min(STEPS.length - 1, Math.floor(ratio * STEPS.length))];

type HeatTilesProps = { items: { key: string; label: string; count: number }[] };

// Counts as tinted tiles (heat map): label, number and its share of the total; a legend reads the scale.
export function HeatTiles({ items }: HeatTilesProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} className={cn('flex min-w-0 flex-col gap-3 rounded-md p-4', step(item.count / max))}>
            <ItemDescription className="text-foreground">{item.label}</ItemDescription>
            <div className="flex items-baseline justify-between gap-2">
              <ItemTitle className="text-2xl font-medium tracking-tight text-impact">
                {number.format(item.count)}
              </ItemTitle>
              <ItemDescription className="text-xs">
                {`${Math.round((item.count / (total || 1)) * 100)}%`}
              </ItemDescription>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="flex items-center gap-2">
        <ItemDescription className="text-xs">{t('less')}</ItemDescription>
        {STEPS.map((tone) => (
          <span key={tone} className={cn('h-2 w-5 rounded-full', tone)} />
        ))}
        <ItemDescription className="text-xs">{t('more')}</ItemDescription>
      </div>
    </div>
  );
}
