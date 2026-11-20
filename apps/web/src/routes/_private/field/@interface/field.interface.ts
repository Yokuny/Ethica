import { calendarDateSchema } from '@ethica/contracts';
import { z } from 'zod';

// Date range of the logistics pages (AD-239), both ends included (without it, today in the display time zone);
// `focus` centers the map on one appointment ("Ver no mapa").
export const fieldSearchSchema = z.object({
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  focus: z.string().min(1).optional(),
});
export type FieldSearch = z.infer<typeof fieldSearchSchema>;
