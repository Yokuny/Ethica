import { z } from 'zod';

export const inviteSearchSchema = z
  .object({})
  .passthrough()
  .transform((search) => ({ ...search, token: typeof search.token === 'string' ? search.token : undefined }));

export type InvitePeek = { tenantName: string; email: string };
export type InviteSearch = z.infer<typeof inviteSearchSchema>;
