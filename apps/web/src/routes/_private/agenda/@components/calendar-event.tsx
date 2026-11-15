import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { CSSProperties } from 'react';
import { calendarEntryStatusLabel } from '@/components/calendar-entry-labels.js';
import { Time12h } from '@/components/time12h.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';
import { TYPE_COLORS } from '../@consts/calendar.js';

// Soft block without a border, color only from the type (TYPE_COLORS); one line by default.
const chipClasses =
  'w-full rounded-md px-1.5 py-1 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export type CalendarEventChipProps = {
  item: AppointmentRecord;
  onSelect: (item: AppointmentRecord) => void;
  // 'timed': title over the time range, fills the block height (day/week). 'compact': one line (month and "+N").
  variant?: 'timed' | 'compact';
  className?: string;
  style?: CSSProperties;
};

export function CalendarEventChip({ item, onSelect, variant = 'timed', className, style }: CalendarEventChipProps) {
  return (
    <button
      type="button"
      data-testid={`calendar-event-${item.id}`}
      title={item.title}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      style={style}
      className={cn(
        chipClasses,
        variant === 'timed' && 'flex flex-col gap-0.5 overflow-hidden',
        TYPE_COLORS[item.type].chip,
        item.status === 'canceled' && 'line-through opacity-60',
        item.status === 'done' && 'opacity-60',
        className,
      )}
    >
      {variant === 'timed' ? (
        <>
          <ItemTitle className="line-clamp-2 block w-full text-xs text-inherit leading-tight">{item.title}</ItemTitle>
          <ItemDescription className="line-clamp-1 text-xs text-inherit opacity-70">
            <Time12h value={item.start} /> – <Time12h value={item.end} />
          </ItemDescription>
        </>
      ) : (
        <ItemDescription className="line-clamp-1 text-xs text-inherit">
          <span className="opacity-70">
            <Time12h value={item.start} />
          </span>{' '}
          <span className="font-medium">{item.title}</span>
        </ItemDescription>
      )}
    </button>
  );
}

// All-day entry (AD-169): deadline or finance, without a time. An open one past its day shows in red;
// paid, filed, missed and canceled stay on the day with the mark beside the title (AEV-03).
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
  const text = [
    `${t(entry.type)}: ${entry.title}`,
    entry.amountCents ? formatMoney(entry.amountCents) : '',
    entry.caseNumber ?? '',
    mark ?? '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      type="button"
      data-testid={`calendar-entry-${entry.id}`}
      title={text}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(entry);
      }}
      className={cn(
        chipClasses,
        TYPE_COLORS[entry.type].chip,
        entry.status === 'open' && entry.date < today && 'bg-destructive/15 text-destructive hover:bg-destructive/20',
        entry.status !== 'open' && entry.type !== 'receipt' && 'opacity-60',
        entry.status === 'canceled' && 'line-through',
      )}
    >
      <ItemDescription className="line-clamp-1 text-xs font-medium text-inherit">{text}</ItemDescription>
    </button>
  );
}
