import {
  CASE_LIST_SORTS,
  CASE_PHASES,
  CASE_STATUS,
  COURTTYPES,
  type CreateCase,
  SORT_ORDERS,
  type UpdateCase,
} from '@ethica/contracts';
import { z } from 'zod';

export const casesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  // Option filters with several values (FIL-03).
  phase: z.array(z.enum(CASE_PHASES)).optional(),
  status: z.array(z.enum(CASE_STATUS)).optional(),
  courtType: z.array(z.enum(COURTTYPES)).optional(),
  // "Tipo" filter (AD-177): Perícia, Assistência técnica or an own type by name.
  role: z.array(z.enum(['court_expert', 'technical_assistant'])).optional(),
  serviceType: z.array(z.string()).optional(),
  serviceOrder: z.string().optional(),
  sort: z.enum(CASE_LIST_SORTS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
  deliveryFrom: z.string().optional(),
  deliveryTo: z.string().optional(),
});
export type CasesSearch = z.infer<typeof casesSearchSchema>;

// `add` and `details` form fields: the edit ones + the report deadline, the perícia date and the payment,
// which only exist at registration (the delivery deadline, AD-109, the appointment, AD-160, and the
// receipt, AD-176).
export type CaseFormValues = UpdateCase & Pick<CreateCase, 'reportDeadline' | 'inspection' | 'payment'>;
