import { COURT_DIVISION_CSV_COLUMNS, COURT_DIVISION_CSV_EXAMPLE, CSV_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { CsvImportReport } from '@/components/csv-import-report.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { FormDialog } from '@/components/form-dialog.js';
import { downloadCsvTemplate } from '@/lib/helpers/csvTemplate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { importCourtDivisionsMutation } from '@/query/court-division.js';

// VAR-02: template to download, file to send and the report by line.
export function CourtDivisionsImportDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation(importCourtDivisionsMutation(queryClient));
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <FormDialog
      size="lg"
      title={t('import_spreadsheet')}
      description={t('court_divisions_import_description')}
      onClose={onClose}
    >
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            downloadCsvTemplate(COURT_DIVISION_CSV_COLUMNS, COURT_DIVISION_CSV_EXAMPLE, 'modelo-varas.csv')
          }
        >
          <Download />
          {t('download_template')}
        </Button>
        <Button disabled={mutation.isPending} onClick={() => inputRef.current?.click()}>
          <FileUp />
          {t('send_spreadsheet')}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-label={t('send_spreadsheet')}
        onChange={handleFile}
      />
      {fileError && (
        <ItemDescription role="alert" className="text-destructive line-clamp-none">
          {fileError}
        </ItemDescription>
      )}
      {mutation.isPending ? (
        <DefaultLoading />
      ) : (
        mutation.data && (
          <CsvImportReport
            result={{
              ...mutation.data,
              skipped: mutation.data.skipped.map((item) => ({ line: item.line, label: item.name })),
            }}
            skippedReason={t('already_exists')}
          />
        )
      )}
    </FormDialog>
  );
}
