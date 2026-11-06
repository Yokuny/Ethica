import { CASE_ATTACHMENT_LIMIT } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type CaseAttachment, deleteCaseAttachmentMutation } from '@/query/case.js';
import type { CaseAttachmentsForm } from '../@hooks/use-case-attachments.js';

type CaseAttachmentsFieldProps = {
  form: CaseAttachmentsForm;
  // Editing: the service and the files it already has.
  caseId?: string;
  saved?: CaseAttachment[];
};

// Beside the notes (SPA-03): the saved files, removed at once, and the chosen ones, sent when saving.
export function CaseAttachmentsField({ form, caseId, saved = [] }: CaseAttachmentsFieldProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(deleteCaseAttachmentMutation(queryClient));
  const inputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<CaseAttachment | null>(null);

  function handleRemove() {
    if (!caseId || !removing) return;
    deleteMutation.mutate(
      { caseId, attachmentId: removing.id },
      { onSuccess: () => setRemoving(null), onError: (error: Error) => toast.error(error.message) },
    );
  }

  const rows = [
    ...saved.map((item) => ({ key: item.id, name: item.name, onRemove: () => setRemoving(item) })),
    ...form.files.map((file, index) => ({
      key: `${file.name}-${index}`,
      name: file.name,
      onRemove: () => form.removeFile(file),
    })),
  ];

  return (
    <div className="grid gap-2">
      <ItemTitle>{t('attachments')}</ItemTitle>
      <ItemDescription className="line-clamp-none">{t('attachments_description')}</ItemDescription>
      {rows.length > 0 && (
        <ul className="grid gap-1">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-2">
              <ItemDescription className="min-w-0 truncate">{row.name}</ItemDescription>
              <Button type="button" variant="ghost" size="icon" aria-label={t('remove')} onClick={row.onRemove}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" className="w-fit" onClick={() => inputRef.current?.click()}>
        <Paperclip />
        {t('attach_files')}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={CASE_ATTACHMENT_LIMIT.mimes.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label={t('attach_files')}
        onChange={(event) => {
          form.addFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {removing && (
        <ConfirmDialog
          title={t('remove_attachment_question')}
          description={removing.name}
          confirmLabel={t('remove')}
          pending={deleteMutation.isPending}
          onConfirm={handleRemove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
