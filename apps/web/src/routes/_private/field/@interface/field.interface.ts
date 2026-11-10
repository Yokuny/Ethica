import { calendarDateSchema } from '@ethica/contracts';
import { z } from 'zod';

// The two field views (AD-194): the map (default) and the list.
export const FIELD_VIEWS = ['map', 'list'] as const;
export type FieldView = (typeof FIELD_VIEWS)[number];

// Period shown (CPE-01): the day (default, every appointment) or the week, month or year (only the inspections).
export const FIELD_PERIODS = ['day', 'week', 'month', 'year'] as const;
export type FieldPeriod = (typeof FIELD_PERIODS)[number];

// Reference day of the period (without it, today in the display time zone), the period and the view.
export const fieldSearchSchema = z.object({
  date: calendarDateSchema.optional(),
  period: z.enum(FIELD_PERIODS).optional(),
  view: z.enum(FIELD_VIEWS).optional(),
});
export type FieldSearch = z.infer<typeof fieldSearchSchema>;
