import { z } from 'zod';

export const inspectionSearchSchema = z.object({ id: z.string().min(1) });
export type InspectionSearch = z.infer<typeof inspectionSearchSchema>;
