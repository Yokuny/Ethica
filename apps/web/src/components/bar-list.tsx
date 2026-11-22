import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';

// Identity color, fixed across panels: the chart blue for counts and income, the error tone for expenses.
const TONE = { info: 'bg-chart-1', error: 'bg-status-error-indicator' } as const;

export type BarListItem = {
  key: string;
  label: string;
  amount: number;
  // The amount already written (count or money).
  value: string;
  // Context on the right: share, change against the previous period…
  detail?: string;
  // Total row on top of a breakdown: label in the title weight.
  strong?: boolean;
  // Drill-down: the row becomes this link (`<Link to=… search=… />`), no children.
  render?: ReactElement;
};

type BarListProps = {
  tone: keyof typeof TONE;
  items: BarListItem[];
  // Largest value of the scale; pass the same `max` to lists that are compared side by side.
  max?: number;
};

// Horizontal bars (AD-253): label, a bar as long as the amount against the largest one (no track: it is not
// progress towards a goal), the value at the end and the context written. Nothing depends on hovering.
export function BarList({ tone, items, max }: BarListProps) {
  const scale = max ?? Math.max(0, ...items.map((item) => item.amount));
  const linked = items.some((item) => item.render);
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.key}>
          <BarRow item={item} tone={tone} ratio={scale ? item.amount / scale : 0} linked={linked} />
        </li>
      ))}
    </ul>
  );
}

function BarRow({
  item,
  tone,
  ratio,
  linked,
}: {
  item: BarListItem;
  tone: keyof typeof TONE;
  ratio: number;
  linked: boolean;
}) {
  return useRender({
    defaultTagName: 'div',
    render: item.render,
    props: {
      className: cn(
        'grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-md py-1.5 sm:grid-cols-[minmax(7rem,12rem)_1fr_auto]',
        item.render &&
          '-mx-2 px-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/25',
      ),
      children: (
        <>
          {item.strong ? (
            <ItemTitle className="col-span-2 truncate font-medium sm:col-span-1">{item.label}</ItemTitle>
          ) : (
            <ItemDescription className="col-span-2 truncate text-foreground sm:col-span-1">
              {item.label}
            </ItemDescription>
          )}
          <div aria-hidden className="h-2">
            {item.amount > 0 && (
              <div className={cn('h-full min-w-1 rounded-full', TONE[tone])} style={{ width: `${ratio * 100}%` }} />
            )}
          </div>
          <div className="flex items-center justify-end gap-3">
            {/* On the phone the detail goes under the value, leaving the width to the bar. */}
            <div className="flex flex-col items-end sm:flex-row sm:items-baseline sm:gap-3">
              <ItemTitle className="font-medium tabular-nums">{item.value}</ItemTitle>
              {item.detail !== undefined && (
                <ItemDescription className="text-right text-xs tabular-nums sm:w-36">{item.detail}</ItemDescription>
              )}
            </div>
            {linked && (
              <ChevronRight aria-hidden className={cn('size-4 text-muted-foreground', !item.render && 'invisible')} />
            )}
          </div>
        </>
      ),
    },
  });
}
