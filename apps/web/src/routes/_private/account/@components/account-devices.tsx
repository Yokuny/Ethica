import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { InfoCard, InfoCardList } from '@/components/info-card.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { passkeysQuery, removePasskeyMutation } from '@/query/passkey.js';

// APA-08 (AD-220): one computer and one phone at a time. Removing the device in use ends this
// session too, and the next screen is the sign-in.
export function AccountDevices() {
  const queryClient = useQueryClient();
  const query = useQuery(passkeysQuery);
  const remove = useMutation(removePasskeyMutation(queryClient));
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (query.isLoading) return <DefaultLoading />;
  if (query.isError || !query.data)
    return (
      <DefaultEmptyData
        title={t('load_error')}
        action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
      />
    );

  return (
    <InfoCardList>
      {query.data.map((device) => (
        <InfoCard
          key={device.id}
          title={device.label}
          description={[
            `${t('added_on')} ${formatDate(device.createdAt)}`,
            device.lastUsedAt && `${t('last_used')} ${formatDate(device.lastUsedAt)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
          badge={
            <Badge variant="secondary">
              {device.kind === 'mobile' ? <Smartphone /> : <Laptop />}
              {t(device.kind === 'mobile' ? 'cell_phone' : 'computer')}
            </Badge>
          }
          actions={
            <Button variant="outline" size="sm" onClick={() => setRemovingId(device.id)}>
              {t('remove')}
            </Button>
          }
        />
      ))}
      {removingId && (
        <ConfirmDialog
          title={t('remove')}
          description={t('remove_device_description')}
          confirmLabel={t('remove')}
          pending={remove.isPending}
          errorMessage={remove.error?.message}
          onConfirm={() => remove.mutate(removingId, { onSuccess: () => setRemovingId(null) })}
          onClose={() => setRemovingId(null)}
        />
      )}
    </InfoCardList>
  );
}
