import { type DateInput, formatTime12hParts } from '@/lib/helpers/formatDate.helper.js';

export type Time12hProps = { value: DateInput };

// AM/PM colado ao número, numa fonte menor que ele (`text-[0.7em]`, relativo
// ao font-size do pai — cada chamador aparece num contexto de tamanho
// diferente: chip do calendário, detalhe do appointment, agenda semanal do
// Professional) — só o split de formatTime12hParts pode fazer essa
// distinção visual; a string pronta de formatTime12h não carrega onde o
// período começa.
export function Time12h({ value }: Time12hProps) {
  const parts = formatTime12hParts(value);
  if (!parts) return null;
  return (
    <>
      {parts.value}
      <span className=" font-mono font-medium pl-0.5">{parts.period}</span>
    </>
  );
}
