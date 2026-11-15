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

// Soft block without a border, color only from the type (TYPE_COLORS). Always at least two lines, as in
// the DentalEase agenda: the title (ItemTitle) over the time or details (ItemDescription, softer).
const chipClasses =
  'flex w-full min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
const titleClasses = 'block w-full text-xs text-inherit leading-tight';
const descriptionClasses = 'line-clamp-1 text-[11px] text-inherit leading-tight opacity-70';

export type CalendarEventChipProps = {
  item: AppointmentRecord;
  onSelect: (item: AppointmentRecord) => void;
  // 'timed': fills the block height and the title may take two lines (day/week). 'compact': title in one line (month and "+N").
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
        variant === 'timed' && 'overflow-hidden',
        TYPE_COLORS[item.type].chip,
        item.status === 'canceled' && 'line-through opacity-60',
        item.status === 'done' && 'opacity-60',
        className,
      )}
    >
      <ItemTitle className={cn(titleClasses, variant === 'timed' ? 'line-clamp-2' : 'line-clamp-1')}>
        {item.title}
      </ItemTitle>
      <ItemDescription className={descriptionClasses}>
        <Time12h value={item.start} /> – <Time12h value={item.end} />
      </ItemDescription>
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
  // The title on top; type, amount, case and mark below it.
  const details = [t(entry.type), entry.amountCents ? formatMoney(entry.amountCents) : '', entry.caseNumber, mark]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      type="button"
      data-testid={`calendar-entry-${entry.id}`}
      title={`${entry.title} · ${details}`}
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
      <ItemTitle className={cn(titleClasses, 'line-clamp-1')}>{entry.title}</ItemTitle>
      <ItemDescription className={descriptionClasses}>{details}</ItemDescription>
    </button>
  );
}
