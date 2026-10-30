import type { CreateInvite } from '@ethica/contracts';
import { post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';

export const inviteMutation = () => ({
  mutationFn: async (data: CreateInvite) => {
    const res = await post<{ id: string }>('/tenant/invites', data);
    if (!res.success || !res.data) throw new Error(res.message || t('action_error'));
    return res;
  },
});
