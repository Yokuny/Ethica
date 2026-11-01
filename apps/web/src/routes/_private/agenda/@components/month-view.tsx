import { ItemDescription } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import {
  addDaysToDisplayDate,
  displayWeekStartOf,
  startOfDisplayMonth,
  weekdayIndexOfDisplayDate,
} from '@/lib/helpers/displayTime.helper.js';
import { t, WEEKDAY_KEYS } from '@/lib/helpers/translate.helper.js';
import type { CompromissoRecord } from '@/query/compromisso.js';
import type { DeadlineRecord } from '@/query/deadline.js';
import { itemOverlapsDay } from '../@utils/calendar-grid.utils.js';
import { CalendarDeadlineChip, CalendarEventChip } from './calendar-event.js';
import { CalendarMonthCell, CalendarMonthGrid } from './calendar-grid.js';

export type MonthViewProps = {
  // Qualquer data de parede dentro do mês exibido (YYYY-MM-DD).
  month: string;
  items: CompromissoRecord[];
  onSelect: (item: CompromissoRecord) => void;
  // Prazos pendentes: entram primeiro no dia do vencimento, sem contar no limite de compromissos.
  deadlines?: DeadlineRecord[];
  onSelectDeadline?: (deadline: DeadlineRecord) => void;
  today?: string;
};

const WEEKS_IN_GRID = 6;
const DAYS_IN_WEEK = 7;
const MAX_VISIBLE_PER_DAY = 3;

// Grade 6x7 (semana começando segunda, mesma convenção do projeto) — dias
// fora do mês (preenchendo a primeira/última semana) ficam esmaecidos.
export function MonthView({
  month,
  items,
  onSelect,
  deadlines = [],
  onSelectDeadline = () => {},
  today = '',
}: MonthViewProps) {
  const monthPrefix = startOfDisplayMonth(month).slice(0, 7);
  const gridStart = displayWeekStartOf(startOfDisplayMonth(month));
  const days = Array.from({ length: WEEKS_IN_GRID * DAYS_IN_WEEK }, (_, index) =>
    addDaysToDisplayDate(gridStart, index),
  );
  // Rótulos tirados da própria primeira linha da grade: WEEKDAY_KEYS começa
  // no domingo, a grade começa na segunda.
  const weekdayKeys = days.slice(0, DAYS_IN_WEEK).map((day) => WEEKDAY_KEYS[weekdayIndexOfDisplayDate(day)]);

  // Cabeçalho e células no MESMO CalendarMonthGrid: as linhas tracejadas
  // (moldura, entre colunas, sob o cabeçalho, entre semanas) vêm todas do
  // primitivo, sem nenhuma borda aqui.
  return (
    <CalendarMonthGrid data-testid="month-view">
      {weekdayKeys.map((key) => (
        <ItemDescription key={key} className="line-clamp-none p-1 text-center text-[10px]">
          {t(key)}
        </ItemDescription>
      ))}
      {days.map((day) => {
        const dayItems = items
          .filter((item) => itemOverlapsDay(item, day))
          .sort((a, b) => a.inicio.localeCompare(b.inicio));
        const visible = dayItems.slice(0, MAX_VISIBLE_PER_DAY);
        const overflow = dayItems.slice(MAX_VISIBLE_PER_DAY);

        return (
          <CalendarMonthCell key={day} data-testid={`month-view-day-${day}`} outside={!day.startsWith(monthPrefix)}>
            <div className="text-right text-[10px]">{day.slice(-2)}</div>
            {deadlines
              .filter((deadline) => deadline.vencimento === day)
              .map((deadline) => (
                <CalendarDeadlineChip key={deadline.id} deadline={deadline} today={today} onSelect={onSelectDeadline} />
              ))}
            {visible.map((item) => (
              <CalendarEventChip key={item.id} item={item} onSelect={onSelect} variant="compact" />
            ))}
            {overflow.length > 0 && (
              <Popover>
                <PopoverTrigger className="text-left text-[10px] text-muted-foreground hover:underline">
                  +{overflow.length} {t('more')}
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  {overflow.map((item) => (
                    <CalendarEventChip key={item.id} item={item} onSelect={onSelect} variant="compact" />
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </CalendarMonthCell>
        );
      })}
    </CalendarMonthGrid>
  );
}
