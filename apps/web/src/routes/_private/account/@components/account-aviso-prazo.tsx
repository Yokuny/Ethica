import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Checkbox } from '@/components/checkbox.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { preferencesQuery, updatePreferencesMutation } from '../@query/account.js';

// AD-110: cada pessoa liga ou desliga o próprio aviso diário de prazos (começa ligado).
export function AccountAvisoPrazo() {
  const queryClient = useQueryClient();
  const query = useQuery(preferencesQuery);
  const mutation = useMutation(updatePreferencesMutation(queryClient));

  if (query.isLoading || !query.data) return <DefaultLoading />;

  return (
    <Checkbox
      label={t('deadline_email_alert')}
      checked={query.data.avisoPrazoEmail}
      disabled={mutation.isPending}
      onCheckedChange={(checked) =>
        mutation.mutate({ avisoPrazoEmail: checked }, { onError: (error: Error) => toast.error(error.message) })
      }
    />
  );
}
