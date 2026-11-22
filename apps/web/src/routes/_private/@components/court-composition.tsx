import { COURTTYPES, type CourtType } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import { courtTypeLabel } from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';

const number = new Intl.NumberFormat('pt-BR');
// Series identity, fixed: one chart tone per court type; services without a court type stay neutral gray.
const TONE: Record<CourtType | 'none', string> = {
  labor: 'bg-chart-1',
  civil: 'bg-chart-2',
  federal: 'bg-chart-3',
  none: 'bg-status-neutral-indicator',
};

// Services by court type as parts of one whole (AD-253): a single bar where 100% is every service, the ones
// without a court type included, and below it the legend written with count and share. Each court type opens
// the list filtered by it.
export function CourtComposition({ groups }: { groups: { key: string; count: number }[] }) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const parts = [
    ...COURTTYPES.map((key) => ({ key, count: groups.find((group) => group.key === key)?.count ?? 0 }))
      .filter((part) => part.count)
      .sort((a, b) => b.count - a.count),
    { key: 'none' as const, count: groups.find((group) => group.key === 'none')?.count ?? 0 },
  ].filter((part) => part.count);
  const share = (count: number) => `${Math.round((count / (total || 1)) * 100)}%`;

  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts.map((part) => (
          <div key={part.key} className={TONE[part.key]} style={{ width: `${(part.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {parts.map((part) => {
          const content = (
            <>
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', TONE[part.key])} />
              <ItemDescription className="flex-1 text-foreground">
                {part.key === 'none' ? t('without_court_type') : courtTypeLabel(part.key)}
              </ItemDescription>
              <ItemTitle className="font-medium tabular-nums">{number.format(part.count)}</ItemTitle>
              <ItemDescription className="w-10 text-right text-xs tabular-nums">{share(part.count)}</ItemDescription>
              <ChevronRight
                aria-hidden
                className={cn('size-4 text-muted-foreground', part.key === 'none' && 'invisible')}
              />
            </>
          );
          const row = 'flex items-center gap-3 rounded-md py-1.5';
          return (
            <li key={part.key}>
              {part.key === 'none' ? (
                <div className={row}>{content}</div>
              ) : (
                <Link
                  to="/expert-cases"
                  search={{ courtType: [part.key] }}
                  className={cn(
                    row,
                    '-mx-2 px-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/25',
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
