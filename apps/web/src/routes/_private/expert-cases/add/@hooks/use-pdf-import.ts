import { PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { useMutation } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import { importPdfMutation, type PdfExtraction } from '../../@query/import.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';
import { PDF_MAX_SIZE_TEXT } from '../@consts/pdf-max-size.js';

// IMP-01: the PDF (or a ZIP with the PDFs of a process split into parts, AD-173) fills the form;
// the expert checks and saves (AD-115). Windows names the ZIP `application/x-zip-compressed`.
const ZIP_TYPES = ['application/zip', 'application/x-zip-compressed'];
export function usePdfImport(form: UseFormReturn<CaseFormValues>) {
  const mutation = useMutation(importPdfMutation());
  const [extraction, setExtraction] = useState<PdfExtraction | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || mutation.isPending) return;
    setFileError(null);
    const zip = ZIP_TYPES.includes(file.type) || /\.zip$/i.test(file.name);
    if (!zip && file.type && file.type !== 'application/pdf') return setFileError(t('unsupported_file_type'));
    if (file.size > PDF_IMPORT_MAX_BYTES) return setFileError(`${t('file_too_large')} ${PDF_MAX_SIZE_TEXT}.`);
    mutation.mutate(
      { file, type: zip ? 'application/zip' : 'application/pdf' },
      {
        onSuccess: (result) => {
          form.reset({ ...DEFAULT_VALUES, ...result.draft });
          setExtraction(result);
        },
        onError: (error: Error) => setFileError(error.message),
      },
    );
  }

  return { handleFile, extraction, fileError, isPending: mutation.isPending };
}
