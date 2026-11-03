import { CSV_IMPORT_MAX_BYTES, type CsvImportField } from '@ethica/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import { csvColumnsMutation, importCsvMutation } from '../../@query/import.js';

// Excel in pt-BR saves CSV in Windows-1252: what is not valid UTF-8 is read as it.
const readCsv = async (file: File): Promise<Blob> => {
  const bytes = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return new Blob([text], { type: 'text/csv;charset=utf-8' });
};

// Any spreadsheet (RSV-04): choose the file, check the field of each column, import.
export function useCsvImport() {
  const queryClient = useQueryClient();
  const columns = useMutation(csvColumnsMutation());
  const importing = useMutation(importCsvMutation(queryClient));
  const [file, setFile] = useState<Blob | null>(null);
  const [fields, setFields] = useState<CsvImportField[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen || columns.isPending || importing.isPending) return;
    setFileError(null);
    setFile(null);
    columns.reset();
    importing.reset();
    if (!chosen.name.toLowerCase().endsWith('.csv')) return setFileError(t('unsupported_file_type'));
    if (chosen.size > CSV_IMPORT_MAX_BYTES) return setFileError(t('file_too_large'));
    const text = await readCsv(chosen);
    columns.mutate(text, {
      onSuccess: (found) => {
        setFile(text);
        setFields(found.map((column) => column.field));
      },
      onError: (error: Error) => setFileError(error.message),
    });
  }

  function setField(index: number, field: CsvImportField) {
    setFields((current) => current.map((value, i) => (i === index ? field : value)));
  }

  function submit() {
    if (!file || importing.isPending) return;
    importing.mutate(
      { file, fields },
      {
        onSuccess: () => setFile(null),
        onError: (error: Error) => setFileError(error.message),
      },
    );
  }

  return {
    handleFile,
    columns: file ? columns.data : undefined,
    fields,
    setField,
    submit,
    result: importing.data,
    fileError,
    isPending: columns.isPending || importing.isPending,
  };
}
