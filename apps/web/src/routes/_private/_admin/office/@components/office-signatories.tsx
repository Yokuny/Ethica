import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { SignatoryDialog } from '@/components/signatory-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { deleteSignatoryMutation, type SignatoryRecord, signatoriesQuery } from '@/query/signatory.js';

// Technical responsibles who sign reports besides the account owner (NLA-02).
export function OfficeSignatories() {
  const queryClient = useQueryClient();
  const query = useQuery(signatoriesQuery);
  const removal = useMutation(deleteSignatoryMutation(queryClient));
  const [editing, setEditing] = useState<SignatoryRecord | 'new' | null>(null);
  const [removing, setRemoving] = useState<SignatoryRecord | null>(null);
  if (query.isLoading) return <DefaultLoading />;
  const signatories = query.data ?? [];

  return (
    <div className="flex w-full flex-col items-start gap-3">
      {signatories.length ? (
        <ItemGroup>
          {signatories.map((signatory) => (
            <Item key={signatory.id} render={<li />}>
              <ItemContent>
                <ItemTitle>{signatory.name}</ItemTitle>
                <ItemDescription>
                  {[signatory.education, signatory.professionalRegistration].filter(Boolean).join(' · ')}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(signatory)}>
                  {t('remove')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(signatory)}>
                  {t('edit')}
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <ItemDescription>{t('no_technical_responsible_yet')}</ItemDescription>
      )}
      <Button variant="outline" onClick={() => setEditing('new')}>
        {t('new_technical_responsible')}
      </Button>
      {editing && (
        <SignatoryDialog signatory={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
      {removing && (
        <ConfirmDialog
          title={t('remove_technical_responsible_question')}
          description={removing.name}
          confirmLabel={t('remove')}
          pending={removal.isPending}
          onClose={() => setRemoving(null)}
          onConfirm={() =>
            removal.mutate(
              { id: removing.id },
              { onSuccess: () => setRemoving(null), onError: (error) => toast.error(error.message) },
            )
          }
        />
      )}
    </div>
  );
}
