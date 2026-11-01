import { calendarDateSchema } from '@ethica/contracts';
import { z } from 'zod';

// Field route day; without it, today in the display time zone.
export const fieldSearchSchema = z.object({ date: calendarDateSchema.optional() });
export type FieldSearch = z.infer<typeof fieldSearchSchema>;
