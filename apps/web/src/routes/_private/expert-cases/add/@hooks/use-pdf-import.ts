import { PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { useMutation } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import { importPdfMutation, type PdfExtraction } from '../../@query/import.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

// IMP-01: o PDF preenche o formulário; o perito confere e salva (AD-115).
export function usePdfImport(form: UseFormReturn<CaseFormValues>) {
  const mutation = useMutation(importPdfMutation());
  const [extraction, setExtraction] = useState<PdfExtraction | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || mutation.isPending) return;
    setFileError(null);
    if (file.type && file.type !== 'application/pdf') return setFileError(t('unsupported_file_type'));
    if (file.size > PDF_IMPORT_MAX_BYTES) return setFileError(t('file_too_large'));
    mutation.mutate(file, {
      onSuccess: (result) => {
        form.reset({ ...DEFAULT_VALUES, ...result.draft });
        setExtraction(result);
      },
      onError: (error: Error) => setFileError(error.message),
    });
  }

  return { handleFile, extraction, fileError, isPending: mutation.isPending };
}
