import { DISPLAY_TIMEZONE } from '@ethica/contracts';

// Conversão entre instante (UTC, como é gravado) e hora de parede no fuso de
// exibição (AD-036, AD-103). Módulo puro, sem Mongoose: usado pelos services ao
// converter `date`+`time` de entrada e pelas séries diárias dos indicadores.

// Resolve o offset (em minutos, positivo a leste de UTC) em vigor num
// instante, para um fuso nomeado — nunca uma string fixa como '-03:00', que
// quebra se o horário de verão brasileiro voltar (AD-036).
const getOffsetMinutes = (instant: Date, timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const label = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
};

// Hora de parede -> instante UTC, sem offset cravado: duas passadas de
// Intl.DateTimeFormat (verificado por execução no Design — ver
// Research Provenance de design.md). A primeira passada estima o offset a
// partir de uma leitura ingênua (a hora de parede interpretada como se já
// fosse UTC); a segunda re-resolve o offset no instante candidato, que é o
// que efetivamente vale para a data alvo.
export const wallClockToUtc = (date: string, time: string, timeZone: string = DISPLAY_TIMEZONE): Date => {
  const naiveUtcMs = Date.parse(`${date}T${time}:00.000Z`);
  const firstPassOffset = getOffsetMinutes(new Date(naiveUtcMs), timeZone);
  const candidateMs = naiveUtcMs - firstPassOffset * 60_000;
  const secondPassOffset = getOffsetMinutes(new Date(candidateMs), timeZone);
  return new Date(naiveUtcMs - secondPassOffset * 60_000);
};

export const dateInDisplayTz = (instant: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

export const timeInDisplayTz = (instant: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
