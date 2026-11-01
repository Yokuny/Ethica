import { type DateInput, formatTime12hParts } from '@/lib/helpers/formatDate.helper.js';

export type Time12hProps = { value: DateInput };

// AM/PM glued to the number, in a smaller font than it (`text-[0.7em]`, relative
// to the parent font-size — each caller shows up in a different size
// context: calendar chip, appointment detail, weekly agenda of the
// Professional) — only the formatTime12hParts split can make that
// visual distinction; the ready-made string of formatTime12h does not carry where the
// period starts.
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
