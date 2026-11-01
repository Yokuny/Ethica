import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { CSSProperties } from 'react';
import { Time12h } from '@/components/time12h.js';
import { cn } from '@/lib/utils.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { DeadlineRecord } from '@/query/deadline.js';

// Color by appointment type; canceled fades and completed stays faded.
const typeClasses: Record<AppointmentRecord['type'], string> = {
  inspection: 'border-violet-500/30 bg-violet-50 text-violet-900',
  hearing: 'border-sky-500/30 bg-sky-50 text-sky-900',
  meeting: 'border-cyan-500/30 bg-cyan-50 text-cyan-900',
  other: 'bg-background',
};

export type CalendarEventChipProps = {
  item: AppointmentRecord;
  onSelect: (item: AppointmentRecord) => void;
  // 'timed': full time range (day/week). 'compact': one line (month and "+N").
  variant?: 'timed' | 'compact';
  className?: string;
  style?: CSSProperties;
};

export function CalendarEventChip({ item, onSelect, variant = 'timed', className, style }: CalendarEventChipProps) {
  return (
    <button
      type="button"
      data-testid={`calendar-event-${item.id}`}
      onClick={() => onSelect(item)}
      style={style}
      className={cn(
        'rounded-sm border text-left text-xs',
        variant === 'compact' ? 'w-full truncate px-1.5 py-0.5' : 'overflow-hidden p-1.5',
        typeClasses[item.type],
        item.status === 'canceled' && 'border-muted-foreground/30 bg-muted text-muted-foreground line-through',
        item.status === 'done' && 'opacity-60',
        className,
      )}
    >
      {variant === 'timed' ? (
        <>
          <ItemTitle>
            <Time12h value={item.start} /> · <Time12h value={item.end} />
          </ItemTitle>
          <ItemDescription className="text-inherit line-clamp-1">{item.title}</ItemDescription>
        </>
      ) : (
        <ItemDescription className="text-inherit line-clamp-none">
          <Time12h value={item.start} /> {item.title}
        </ItemDescription>
      )}
    </button>
  );
}

// Pending deadline (AD-109): all-day event, without a time; overdue shows in red.
export function CalendarDeadlineChip({
  deadline,
  today,
  onSelect,
}: {
  deadline: DeadlineRecord;
  today: string;
  onSelect: (deadline: DeadlineRecord) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`calendar-deadline-${deadline.id}`}
      onClick={() => onSelect(deadline)}
      className={cn(
        'w-full truncate rounded-sm border px-1.5 py-0.5 text-left text-xs',
        'border-amber-500/40 bg-amber-50 text-amber-900',
        deadline.dueDate < today && 'border-destructive bg-destructive/10 text-destructive',
      )}
    >
      <ItemDescription className="text-inherit line-clamp-none">
        {deadline.title}
        {deadline.caseNumber ? ` · ${deadline.caseNumber}` : ''}
      </ItemDescription>
    </button>
  );
}
