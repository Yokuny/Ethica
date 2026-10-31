import { COMPROMISSO_TIPOS } from '@ethica/contracts';
import { z } from 'zod';
import type { CompromissoRecord } from '@/query/compromisso.js';
import type { PrazoRecord } from '@/query/prazo.js';
import { CALENDAR_VIEWS } from '../@consts/calendar.js';

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

// Qual dialog está aberto — nunca mais de um por vez.
export type PanelState =
  | { kind: 'create'; date?: string }
  | { kind: 'detail'; compromisso: CompromissoRecord }
  | { kind: 'edit'; compromisso: CompromissoRecord }
  | { kind: 'prazo'; prazo: PrazoRecord }
  | null;

// `view`/`date`/`tipo` são a única fonte de verdade do que é renderizado:
// toda mudança passa por navigate() e refaz a consulta ao servidor.
export const calendarSearchSchema = z.object({
  view: z.enum(CALENDAR_VIEWS).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date inválida (YYYY-MM-DD)')
    .optional(),
  tipo: z.enum(COMPROMISSO_TIPOS).optional(),
  // Atalho do detalhe da perícia: abre o "novo compromisso" já vinculado.
  periciaId: z.string().optional(),
});
export type CalendarSearch = z.infer<typeof calendarSearchSchema>;
