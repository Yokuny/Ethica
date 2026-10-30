import { z } from 'zod';
import type { PericiaRecord } from '@/query/pericia.js';

export const periciaDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type PericiaDetailsSearch = z.infer<typeof periciaDetailsSearchSchema>;
export type PericiaEditFormProps = { pericia: PericiaRecord; onSaved: () => void; onCancel: () => void };
