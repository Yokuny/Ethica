import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { CSSProperties } from 'react';
import { calendarEntryStatusLabel } from '@/components/calendar-entry-labels.js';
import { Time12h } from '@/components/time12h.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';

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

// All-day entry (AD-169): deadline or finance, without a time. An open one past its day shows in red;
// paid, filed, missed and canceled stay on the day with the mark beside the title (AEV-03).
const entryClasses: Record<CalendarEntryRecord['type'], string> = {
  deadline: 'border-amber-500/40 bg-amber-50 text-amber-900',
  income: 'border-emerald-500/40 bg-emerald-50 text-emerald-900',
  receipt: 'border-emerald-500/20 bg-emerald-50/60 text-emerald-900',
  expense: 'border-rose-500/30 bg-rose-50 text-rose-900',
};

export function CalendarEntryChip({
  entry,
  today,
  onSelect,
}: {
  entry: CalendarEntryRecord;
  today: string;
  onSelect: (entry: CalendarEntryRecord) => void;
}) {
  const mark = calendarEntryStatusLabel(entry.type, entry.status);
  return (
    <button
      type="button"
      data-testid={`calendar-entry-${entry.id}`}
      onClick={() => onSelect(entry)}
      className={cn(
        'w-full truncate rounded-sm border px-1.5 py-0.5 text-left text-xs',
        entryClasses[entry.type],
        entry.status === 'open' && entry.date < today && 'border-destructive bg-destructive/10 text-destructive',
        entry.status !== 'open' && entry.type !== 'receipt' && 'opacity-60',
        entry.status === 'canceled' && 'line-through',
      )}
    >
      <ItemDescription className="text-inherit line-clamp-none">
        {`${t(entry.type)}: ${entry.title}`}
        {entry.amountCents ? ` · ${formatMoney(entry.amountCents)}` : ''}
        {entry.caseNumber ? ` · ${entry.caseNumber}` : ''}
        {mark ? ` · ${mark}` : ''}
      </ItemDescription>
    </button>
  );
}
