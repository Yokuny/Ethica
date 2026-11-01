import { z } from 'zod';

export const partyDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type PartyDetailsSearch = z.infer<typeof partyDetailsSearchSchema>;
