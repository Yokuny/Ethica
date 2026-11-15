import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { serviceTypeLabel } from '@/components/case-labels.js';
import type { CaseDashboard } from '../@query/dashboard.js';

const number = new Intl.NumberFormat('pt-BR');

// Pastel heat scale: the larger the type's share of the biggest one, the deeper the tint.
const tint = (ratio: number) =>
  ratio > 0.75
    ? 'bg-status-info-border'
    : ratio > 0.5
      ? 'bg-status-info'
      : ratio > 0.25
        ? 'bg-status-info/60'
        : 'bg-status-info/30';

// Total of services per type, one tinted tile each, with its share of the total.
export function ServiceTypeTiles({ rows, total }: { rows: CaseDashboard['byType']; total: number }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <div
          key={row.serviceType ?? row.role}
          className={cn('flex min-w-0 flex-col gap-3 rounded-lg p-4', tint(row.count / max))}
        >
          <ItemDescription className="text-foreground">{serviceTypeLabel(row)}</ItemDescription>
          <div className="flex items-baseline justify-between gap-2">
            <ItemTitle className="text-2xl font-medium tracking-tight text-impact">
              {number.format(row.count)}
            </ItemTitle>
            <ItemDescription className="text-xs">{`${Math.round((row.count / (total || 1)) * 100)}%`}</ItemDescription>
          </div>
        </div>
      ))}
    </div>
  );
}
