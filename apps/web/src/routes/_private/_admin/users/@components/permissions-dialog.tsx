import type { Permissions } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type UserDirectoryEntry, updatePermissionsMutation } from '../@query/user-directory.js';
import { PermissionsMatrix } from './permissions-matrix.js';

// Admin adjustment of a member's matrix (AD-137); applies on their next request.
export function PermissionsDialog({ user, onClose }: { user: UserDirectoryEntry; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<Permissions>(user.permissions);
  const mutation = useMutation({
    ...updatePermissionsMutation(queryClient),
    onSuccess: () => {
      toast.success(t('saved_successfully'));
      onClose();
    },
  });
  return (
    <FormDialog size="lg" title={t('permissions')} description={user.name} onClose={onClose}>
      <PermissionsMatrix value={permissions} onChange={setPermissions} disabled={mutation.isPending} />
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
          onClick={() => mutation.mutate({ userId: user.id, permissions })}
        >
          {t('save')}
        </Button>
      </div>
    </FormDialog>
  );
}
