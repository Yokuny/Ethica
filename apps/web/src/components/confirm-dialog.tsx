import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import type { ReactNode } from 'react';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Confirmação de ação irreversível (remover, arquivar, rejeitar) em Dialog:
// nada apaga no primeiro clique. Montado = aberto, como o FormDialog — quem usa
// renderiza condicionalmente e fecha em `onClose` (Esc, clique fora, ✕, Cancelar).
type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'destructive' | 'default';
  pending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  variant = 'destructive',
  pending = false,
  errorMessage,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <FormDialog size="sm" title={title} description={description} onClose={onClose}>
      {children}
      {errorMessage && (
        <ItemDescription role="alert" className="text-destructive line-clamp-none">
          {errorMessage}
        </ItemDescription>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="button" variant={variant} disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </FormDialog>
  );
}
