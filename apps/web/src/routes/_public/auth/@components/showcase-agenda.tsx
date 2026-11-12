import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
import { cn } from 'cn';
import { addDaysToDisplayDate, currentDisplayWeekStart } from '@/lib/helpers/displayTime.helper.js';
import { t, WEEKDAY_KEYS } from '@/lib/helpers/translate.helper.js';

// APA-10: the week view from Sunday to Thursday. Monday to Wednesday whole; Sunday and Thursday fade at
// the edges, as if the week went on beyond the frame.

const FIRST_HOUR = 8;
const HOURS = 8;
const HOUR_PX = 44;
const HOUR_LIST = Array.from({ length: HOURS }, (_, index) => FIRST_HOUR + index);
const MONDAY = currentDisplayWeekStart();
// Sunday before the week, Monday to Thursday: the two ends are the faded halves.
const DAYS = [-1, 0, 1, 2, 3].map((offset) => addDaysToDisplayDate(MONDAY, offset));

type Tone = 'done' | 'scheduled' | 'deadline';
// Washed-out tones: done green, scheduled neutral, deadline yellow.
const TONE: Record<Tone, string> = {
  done: 'border-emerald-200/70 bg-emerald-50/70',
  scheduled: 'border-border bg-muted/50',
  deadline: 'border-amber-200/70 bg-amber-50/70',
};
const BADGE: Record<Tone, string> = {
  done: 'bg-emerald-100/70 text-emerald-800',
  scheduled: 'bg-background text-muted-foreground',
  deadline: 'bg-amber-100/70 text-amber-800',
};
const LABEL: Record<Tone, string> = { done: t('done'), scheduled: t('scheduled'), deadline: t('deadline') };

const EVENTS: { day: number; start: number; hours: number; what: string; tone: Tone }[] = [
  { day: 0, start: 9, hours: 1.5, what: t('inspection'), tone: 'done' },
  { day: 1, start: 8.5, hours: 1.5, what: t('inspection'), tone: 'done' },
  { day: 1, start: 13, hours: 1.5, what: t('hearing'), tone: 'scheduled' },
  { day: 2, start: 10, hours: 2, what: t('inspection'), tone: 'scheduled' },
  { day: 2, start: 14, hours: 1, what: t('deadline'), tone: 'deadline' },
  { day: 3, start: 9, hours: 1, what: t('meeting'), tone: 'scheduled' },
  { day: 3, start: 11, hours: 2, what: t('inspection'), tone: 'scheduled' },
  { day: 4, start: 9.5, hours: 1.5, what: t('inspection'), tone: 'scheduled' },
];

const clock = (hour: number) => `${Math.floor(hour)}:${hour % 1 ? '30' : '00'}`;

// Fade of the half columns: Sunday toward the left edge, Thursday toward the right one.
const EDGE: Record<number, string> = { 0: 'mask-l-from-30%', 4: 'mask-r-from-30%' };

export function ShowcaseAgenda() {
  return (
    <div className="flex h-full">
      <div className="w-8 shrink-0 pt-6">
        {HOUR_LIST.map((hour) => (
          <ItemDescription key={hour} style={{ height: HOUR_PX }} className="pr-1.5 text-right text-[9px]">
            {hour}h
          </ItemDescription>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-[0.4fr_1fr_1fr_1fr_0.4fr]">
        {DAYS.map((day, column) => (
          <div key={day} className={cn('relative', EDGE[column])}>
            <Separator orientation="vertical" className="absolute inset-y-0 left-0" />
            <ItemDescription className="h-6 truncate whitespace-nowrap px-2 pt-1 text-[10px]">
              {t(WEEKDAY_KEYS[column])} · {day.slice(-2)}
            </ItemDescription>
            {HOUR_LIST.map((hour) => (
              <Separator
                key={hour}
                className="absolute inset-x-0"
                style={{ top: 24 + (hour - FIRST_HOUR) * HOUR_PX }}
              />
            ))}
            {EVENTS.filter((event) => event.day === column).map((event) => (
              <Item
                key={`${event.day}-${event.start}`}
                size="xs"
                className={cn(
                  'absolute inset-x-1 flex-col flex-nowrap items-start gap-0.5 overflow-hidden px-2 py-1.5 shadow-none',
                  TONE[event.tone],
                )}
                style={{
                  top: 24 + (event.start - FIRST_HOUR) * HOUR_PX + 2,
                  height: event.hours * HOUR_PX - 4,
                }}
              >
                <ItemTitle className="w-full truncate font-medium text-[11px]">{event.what}</ItemTitle>
                <ItemDescription className="w-full truncate whitespace-nowrap text-[10px] tabular-nums">
                  {clock(event.start)} – {clock(event.start + event.hours)}
                </ItemDescription>
                {event.hours > 1 && (
                  <Badge className={cn('h-4 px-1.5 text-[9px] uppercase tracking-wide ring-0', BADGE[event.tone])}>
                    {LABEL[event.tone]}
                  </Badge>
                )}
              </Item>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
