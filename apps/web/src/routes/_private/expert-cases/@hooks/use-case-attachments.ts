import { CASE_ATTACHMENT_LIMIT } from '@ethica/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { uploadCaseAttachmentMutation } from '@/query/case.js';

// Files chosen in the service form (SPA-03): they wait on screen and go up, one at a time, after the service is
// saved. A file that fails warns and does not undo the saved service.
export function useCaseAttachments() {
  const queryClient = useQueryClient();
  const mutation = useMutation(uploadCaseAttachmentMutation(queryClient));
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(list: FileList | null) {
    const chosen = Array.from(list ?? []);
    const accepted = chosen.filter((file) => CASE_ATTACHMENT_LIMIT.mimes.includes(file.type));
    const small = accepted.filter((file) => file.size <= CASE_ATTACHMENT_LIMIT.maxBytes);
    if (accepted.length < chosen.length) toast.error(t('unsupported_file_type'));
    if (small.length < accepted.length) toast.error(t('file_too_large'));
    setFiles((current) => [...current, ...small]);
  }

  function removeFile(file: File) {
    setFiles((current) => current.filter((item) => item !== file));
  }

  async function upload(caseId: string) {
    for (const file of files) {
      await mutation
        .mutateAsync({ caseId, file })
        .catch((error: Error) => toast.error(`${file.name}: ${error.message}`));
    }
    setFiles([]);
  }

  return { files, addFiles, removeFile, upload, isUploading: mutation.isPending };
}

export type CaseAttachmentsForm = ReturnType<typeof useCaseAttachments>;
