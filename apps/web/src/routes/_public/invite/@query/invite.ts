import type { AcceptInvite } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get, post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { InvitePeek } from '../@interface/invite.interface.js';

export const invitePeekQuery = (token: string) =>
  queryOptions({
    queryKey: ['invite', 'peek', token],
    queryFn: async (): Promise<InvitePeek> => {
      const response = await get<InvitePeek>(`/invites/${encodeURIComponent(token)}`);
      if (!response.success || !response.data) throw new Error(response.message || t('invalid_link'));
      return response.data;
    },
  });

export function acceptInvite(token: string, data: AcceptInvite) {
  return post(`/invites/${encodeURIComponent(token)}/accept`, data);
}
