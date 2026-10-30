import {
  addDaysToDisplayDate,
  addMonthsToDisplayDate,
  displayWeekStartOf,
  startOfDisplayMonth,
} from '@/lib/helpers/displayTime.helper.js';
import type { CalendarView } from '../@interface/calendar.interface.js';

// Calcula o range [from,to) enviado a compromissosQuery a partir da visão
// ativa — todas as visões ficam abaixo do limite de 62 dias da API
// (MAX_RANGE_DAYS em apps/api/src/modules/agenda/compromisso.schema.ts).
export const rangeForView = (view: CalendarView, date: string): { from: string; to: string } => {
  if (view === 'day') return { from: date, to: addDaysToDisplayDate(date, 1) };
  // Mês: a grade inteira (6 semanas a partir da segunda-feira da 1ª semana), para
  // os dias do mês anterior/seguinte que completam a grade também mostrarem itens.
  if (view === 'month') {
    const from = displayWeekStartOf(startOfDisplayMonth(date));
    return { from, to: addDaysToDisplayDate(from, 42) };
  }
  const from = displayWeekStartOf(date);
  return { from, to: addDaysToDisplayDate(from, 7) };
};

// Passo de navegação anterior/próximo depende da visão ativa: 1 dia, 7 dias
// ou 1 mês (com clamp de fim de mês, addMonthsToDisplayDate).
export const shiftDate = (view: CalendarView, date: string, direction: 1 | -1): string => {
  if (view === 'day') return addDaysToDisplayDate(date, direction);
  if (view === 'month') return addMonthsToDisplayDate(date, direction);
  return addDaysToDisplayDate(date, direction * 7);
};
