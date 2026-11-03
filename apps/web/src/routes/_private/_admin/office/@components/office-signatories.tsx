import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPen } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
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
    <div className="flex flex-col items-start gap-3">
      {signatories.length ? (
        <LinkList className="w-full">
          {signatories.map((signatory) => (
            <LinkListItem
              key={signatory.id}
              icon={UserPen}
              title={signatory.name}
              description={[signatory.education, signatory.professionalRegistration].filter(Boolean).join(' · ')}
            >
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(signatory)}>
                  {t('edit')}
                </Button>
                <Button variant="ghost" onClick={() => setRemoving(signatory)}>
                  {t('remove')}
                </Button>
              </div>
            </LinkListItem>
          ))}
        </LinkList>
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
