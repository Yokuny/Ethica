import { calendarDateSchema } from '@ethica/contracts';
import { z } from 'zod';

// The two field views (AD-194): the day map (default) and the list of the day.
export const FIELD_VIEWS = ['map', 'list'] as const;
export type FieldView = (typeof FIELD_VIEWS)[number];

// Field route day (without it, today in the display time zone) and the view.
export const fieldSearchSchema = z.object({
  date: calendarDateSchema.optional(),
  view: z.enum(FIELD_VIEWS).optional(),
});
export type FieldSearch = z.infer<typeof fieldSearchSchema>;
