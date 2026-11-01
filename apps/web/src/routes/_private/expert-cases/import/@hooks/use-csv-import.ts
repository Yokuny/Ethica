import { CSV_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import { importCsvMutation } from '../../@query/import.js';

export function useCsvImport() {
  const queryClient = useQueryClient();
  const mutation = useMutation(importCsvMutation(queryClient));
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || mutation.isPending) return;
    setFileError(null);
    mutation.reset();
    if (!file.name.toLowerCase().endsWith('.csv')) return setFileError(t('unsupported_file_type'));
    if (file.size > CSV_IMPORT_MAX_BYTES) return setFileError(t('file_too_large'));
    mutation.mutate(file, { onError: (error: Error) => setFileError(error.message) });
  }

  return { handleFile, result: mutation.data, fileError, isPending: mutation.isPending };
}
