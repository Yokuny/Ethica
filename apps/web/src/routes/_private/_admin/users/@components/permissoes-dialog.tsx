import type { Permissoes } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type UserDirectoryEntry, updatePermissoesMutation } from '../@query/user-directory.js';
import { PermissoesMatrix } from './permissoes-matrix.js';

// Ajuste da matriz de um membro pelo admin (AD-137); vale na próxima requisição dele.
export function PermissoesDialog({ user, onClose }: { user: UserDirectoryEntry; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [permissoes, setPermissoes] = useState<Permissoes>(user.permissoes);
  const mutation = useMutation({
    ...updatePermissoesMutation(queryClient),
    onSuccess: () => {
      toast.success(t('saved_successfully'));
      onClose();
    },
  });
  return (
    <FormDialog size="lg" title={t('permissions')} description={user.name} onClose={onClose}>
      <PermissoesMatrix value={permissoes} onChange={setPermissoes} disabled={mutation.isPending} />
      {mutation.error && (
        <ItemDescription role="alert" className="text-destructive line-clamp-none">
          {mutation.error.message}
        </ItemDescription>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ userId: user.id, permissoes })}
        >
          {t('save')}
        </Button>
      </div>
    </FormDialog>
  );
}
