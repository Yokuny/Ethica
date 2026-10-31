import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ScrollArea } from '@ethica/ui/components/scroll-area';
import { weekdayIndexOfDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t, WEEKDAY_KEYS } from '@/lib/helpers/translate.helper.js';
import type { CompromissoRecord } from '@/query/compromisso.js';
import type { PrazoRecord } from '@/query/prazo.js';
import { computePositionedItems, HOUR_HEIGHT_PX, HOURS_IN_DAY } from '../@utils/calendar-grid.utils.js';
import { CalendarEventChip, CalendarPrazoChip } from './calendar-event.js';
import {
  CalendarTimeGrid,
  CalendarTimeGridColumns,
  CalendarTimeGridHeader,
  CalendarTimeGridHourLine,
} from './calendar-grid.js';

export type TimeGridViewProps = {
  // Datas de parede (YYYY-MM-DD, fuso de exibição) das colunas — 1 elemento
  // pra visão de dia, 7 pra visão de semana; mesmo componente pros dois.
  days: string[];
  items: CompromissoRecord[];
  onSelect: (item: CompromissoRecord) => void;
  // Prazos pendentes: faixa "dia inteiro" sob o cabeçalho (prazo é um dia, não um horário).
  prazos?: PrazoRecord[];
  onSelectPrazo?: (prazo: PrazoRecord) => void;
  today?: string;
};

const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour);

// Altura visível do corpo da grade (régua de horas + colunas dos dias): as
// 24h (COLUMN_HEIGHT_PX = 24*48) raramente cabem inteiras na tela, então o
// corpo rola verticalmente AQUI DENTRO (cabeçalho de dia fica fixo em cima)
// em vez de esticar a página inteira.
const GRID_BODY_HEIGHT_PX = 640;

// Sobreposição de horário empilha em cascata (ver computePositionedItems):
// o primeiro item de um cluster fica 100% largo, cada um depois dele desloca
// um pouco à direita e perde só um pouco de largura — nunca divide a coluna
// em 1/N (o que virava lascas de 1 caractere com 3+ horários no mesmo slot).
const overlapStyle = (column: number): { left: string; width: string; zIndex: number } => ({
  left: column === 0 ? '0%' : `${column * 10}%`,
  width: column === 0 ? '100%' : '90%',
  zIndex: 10 + column,
});

// Grade por hora com eventos posicionados por horário/duração
// (calendar-grid.utils.ts). Moldura e linhas tracejadas vêm do primitivo
// (components/ui/calendar-grid.tsx) — aqui só composição e posição.
export function TimeGridView({
  days,
  items,
  onSelect,
  prazos = [],
  onSelectPrazo = () => {},
  today = '',
}: TimeGridViewProps) {
  const hasPrazos = prazos.some((prazo) => days.includes(prazo.vencimento));
  return (
    <CalendarTimeGrid className="min-w-160 flex-col" data-testid="time-grid-view">
      {/* Cabeçalho fixo (fora do ScrollArea): régua de horas vazia + data de
          cada dia, sempre visível enquanto o corpo rola por baixo dele. */}
      <div className="flex">
        <div className="w-10 shrink-0">
          <CalendarTimeGridHeader />
        </div>
        <CalendarTimeGridColumns style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => (
            <CalendarTimeGridHeader key={day}>
              <ItemTitle>{t(WEEKDAY_KEYS[weekdayIndexOfDisplayDate(day)])}</ItemTitle>
              <ItemDescription className="line-clamp-none text-[10px]">{formatDate(day)}</ItemDescription>
            </CalendarTimeGridHeader>
          ))}
        </CalendarTimeGridColumns>
      </div>
      {hasPrazos && (
        <div className="flex" data-testid="time-grid-all-day">
          <ItemDescription className="line-clamp-none w-10 shrink-0 pr-1 text-right text-[10px]">
            {t('all_day')}
          </ItemDescription>
          <CalendarTimeGridColumns style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day) => (
              <div key={day} className="grid content-start gap-1 p-1">
                {prazos
                  .filter((prazo) => prazo.vencimento === day)
                  .map((prazo) => (
                    <CalendarPrazoChip key={prazo.id} prazo={prazo} today={today} onSelect={onSelectPrazo} />
                  ))}
              </div>
            ))}
          </CalendarTimeGridColumns>
        </div>
      )}
      <ScrollArea style={{ height: GRID_BODY_HEIGHT_PX }}>
        <div className="flex">
          <div className="w-10 shrink-0">
            {HOURS.map((hour) => (
              <ItemDescription
                key={hour}
                style={{ height: HOUR_HEIGHT_PX }}
                className="line-clamp-none pr-1 text-right text-[10px]"
              >
                {String(hour).padStart(2, '0')}h
              </ItemDescription>
            ))}
          </div>
          <CalendarTimeGridColumns style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day) => {
              const positioned = computePositionedItems(items, day);

              return (
                <div
                  key={day}
                  data-testid={`time-grid-day-${day}`}
                  className="relative"
                  style={{ height: HOURS_IN_DAY * HOUR_HEIGHT_PX }}
                >
                  {HOURS.slice(1).map((hour) => (
                    <CalendarTimeGridHourLine key={hour} style={{ top: hour * HOUR_HEIGHT_PX }} />
                  ))}
                  {positioned.map(({ item, top, height, column }) => (
                    <CalendarEventChip
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      variant="timed"
                      className="absolute"
                      style={{ top, height, ...overlapStyle(column) }}
                    />
                  ))}
                </div>
              );
            })}
          </CalendarTimeGridColumns>
        </div>
      </ScrollArea>
    </CalendarTimeGrid>
  );
}
