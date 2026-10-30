import { formatDistanceToNow as dateFnsFormatDistanceToNow, format, type Locale } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDisplayDate, formatDisplayTime } from './displayTime.helper.js';
import { DEFAULT_LANGUAGE, type Language } from './translate.helper.js';

// Único ponto do app que importa date-fns: toda data/hora EXIBIDA na tela
// passa por aqui, no formato do idioma do usuário. Os formatos "de dado"
// (`YYYY-MM-DD`/`HH:mm` de search param, valor de <input>, chave de grade)
// continuam em displayTime.helper.ts e nunca vão direto pra tela.

type DateFormats = { locale: Locale; date: string; time: string; dateTime: string };

// Padrões por idioma, em tokens LOCALIZADOS do date-fns (`PP`/`p`): a ordem
// e a pontuação vêm do próprio locale. pt-BR: "1 jun 2026", "14:05".
const DATE_FORMATS: Record<Language, DateFormats> = {
  'pt-BR': { locale: ptBR, date: 'PP', time: 'p', dateTime: "PP '·' p" },
};

export type DateInput = Date | string | number;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^([01]\d|2[0-3]):([0-5]\d)$/;

// 12h com AM/PM colado ao número (sem espaço: "9AM", "6:40PM"), sem os
// minutos quando forem :00 — só usado nos pontos que pedem esse formato
// específico (agenda semanal de Professional, chips/detalhe de Appointment
// no calendário); o resto do app continua em formatTime (24h). O AM/PM sai
// sempre como as 2 letras finais do token `a` (maiúsculas, sem locale
// alternativo hoje) — é isso que PERIOD_SUFFIX usa pra separar os dois na
// hora de renderizar o período numa fonte menor (Time12h, components/).
const HOUR_12_FORMATS: Record<Language, { locale: Locale; hourOnly: string; hourMinute: string }> = {
  'pt-BR': { locale: ptBR, hourOnly: 'ha', hourMinute: 'h:mma' },
};
const PERIOD_SUFFIX = /(AM|PM)$/;

const toInstant = (value: DateInput): Date | null => {
  const instant = value instanceof Date ? value : new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
};

// O `format` do date-fns sempre lê os componentes LOCAIS do Date — então a
// entrada vira um Date "de parede" (componentes locais = o que deve aparecer
// na tela), independente do fuso do navegador:
// - `YYYY-MM-DD` é data de parede, sem fuso: montada direto, nunca via
//   `new Date('2026-06-01')` (meia-noite UTC = 31/05 em fuso negativo).
// - qualquer outra entrada (Date, timestamp, ISO com hora) é um instante:
//   vai pro fuso de exibição (DISPLAY_TIMEZONE, AD-036), nunca o do navegador.
const toWallClock = (value: DateInput): Date | null => {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    return new Date(year, month - 1, day);
  }
  const instant = toInstant(value);
  if (!instant) return null;
  const [year, month, day] = formatDisplayDate(instant).split('-').map(Number) as [number, number, number];
  const [hours, minutes] = formatDisplayTime(instant).split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hours, minutes);
};

const formatAs = (value: DateInput, pattern: 'date' | 'time' | 'dateTime', language: Language): string => {
  const wallClock = toWallClock(value);
  if (!wallClock) return '';
  const formats = DATE_FORMATS[language];
  return format(wallClock, formats[pattern], { locale: formats.locale });
};

/**
 * Data no padrão do idioma. Entrada inválida vira `''`.
 *
 * @example
 * formatDate('2026-06-01') // "1 jun 2026"
 * formatDate('2026-06-01T15:00:00.000Z') // "1 jun 2026" (fuso de exibição)
 */
export const formatDate = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string =>
  formatAs(value, 'date', language);

/**
 * Hora no padrão do idioma, no fuso de exibição.
 *
 * @example
 * formatTime('2026-06-01T15:00:00.000Z') // "12:00"
 */
export const formatTime = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string =>
  formatAs(value, 'time', language);

export type Time12hParts = { value: string; period: string };

/**
 * Hora em 12h com AM/PM, sem os minutos quando forem :00, separada em
 * {value, period} pra quem precisa renderizar o período (AM/PM) numa fonte
 * menor que o número (`Time12h`, `components/time12h.tsx`) — `formatTime12h`
 * abaixo é só a concatenação das duas partes, pra quem só precisa do texto
 * puro (aria-label, título, teste). Aceita tanto um instante/Date (mesma
 * conversão pro fuso de exibição de formatTime) quanto uma hora de parede
 * solta no formato `HH:mm`, sem data (ex.: weeklySchedule de Professional) —
 * nesse caso os minutos já são literais, sem fuso.
 *
 * @example
 * formatTime12hParts('09:00') // { value: '9', period: 'AM' }
 * formatTime12hParts('2026-06-01T21:40:00.000Z') // { value: '6:40', period: 'PM' } (fuso de exibição)
 */
export const formatTime12hParts = (value: DateInput, language: Language = DEFAULT_LANGUAGE): Time12hParts | null => {
  const wallClock =
    typeof value === 'string' && TIME_ONLY.test(value)
      ? new Date(1970, 0, 1, ...(value.split(':').map(Number) as [number, number]))
      : toWallClock(value);
  if (!wallClock) return null;
  const formats = HOUR_12_FORMATS[language];
  const pattern = wallClock.getMinutes() === 0 ? formats.hourOnly : formats.hourMinute;
  const formatted = format(wallClock, pattern, { locale: formats.locale });
  const period = formatted.match(PERIOD_SUFFIX)?.[0] ?? '';
  return { value: formatted.slice(0, formatted.length - period.length), period };
};

/**
 * `formatTime12hParts` como texto puro, sem separar o período — pra
 * aria-label/título/teste, onde não há como (ou não faz sentido) estilizar
 * o AM/PM numa fonte menor.
 *
 * @example
 * formatTime12h('09:00') // "9AM"
 * formatTime12h('2026-06-01T21:40:00.000Z') // "6:40PM" (fuso de exibição)
 */
export const formatTime12h = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string => {
  const parts = formatTime12hParts(value, language);
  return parts ? `${parts.value}${parts.period}` : '';
};

/**
 * Data + hora no padrão do idioma, no fuso de exibição.
 *
 * @example
 * formatDateTime('2026-06-01T15:00:00.000Z') // "1 jun 2026 · 12:00"
 */
export const formatDateTime = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string =>
  formatAs(value, 'dateTime', language);

/**
 * Distância relativa até agora, com sufixo. Comparação de instantes —
 * independe de fuso.
 *
 * @example
 * formatDistanceToNow(threeDaysAgo) // "há 3 dias"
 */
export const formatDistanceToNow = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string => {
  const instant = toInstant(value);
  return instant ? dateFnsFormatDistanceToNow(instant, { locale: DATE_FORMATS[language].locale, addSuffix: true }) : '';
};

// Locale do date-fns do idioma, pra componentes que formatam datas por conta
// própria (o <Calendar> do react-day-picker: mês, dias da semana) — assim
// nenhum outro arquivo importa `date-fns/locale`.
export const getDateLocale = (language: Language = DEFAULT_LANGUAGE): Locale => DATE_FORMATS[language].locale;
