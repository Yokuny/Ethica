import { z } from 'zod';
import type { CaseRecord } from '@/query/case.js';

export const caseDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type CaseDetailsSearch = z.infer<typeof caseDetailsSearchSchema>;
export type CaseEditFormProps = { legalCase: CaseRecord; onSaved: () => void; onCancel: () => void };
