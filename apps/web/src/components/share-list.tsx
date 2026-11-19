import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';

// Same identity colors as the cash flow: income in the chart blue, expenses in the error tone.
const TONE = { income: 'bg-chart-1', expense: 'bg-status-error-indicator' } as const;

type ShareListProps = {
  tone: keyof typeof TONE;
  items: { key: string; label: string; amount: number; value: string }[];
};

// Ranking with the numbers written: name, amount and share of the total, and a bar as long as that share.
// Nothing depends on hovering.
export function ShareList({ tone, items }: ShareListProps) {
  const total = items.reduce((sum, item) => sum + item.amount, 0) || 1;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const share = Math.round((item.amount / total) * 100);
        return (
          <li key={item.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <ItemDescription className="text-foreground">{item.label}</ItemDescription>
              <div className="flex shrink-0 items-baseline gap-3">
                <ItemTitle className="font-medium tabular-nums">{item.value}</ItemTitle>
                <ItemDescription className="w-9 text-right text-xs tabular-nums">{`${share}%`}</ItemDescription>
              </div>
            </div>
            <div aria-hidden className="h-1.5 rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', TONE[tone])}
                style={{ width: `${(item.amount / total) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
