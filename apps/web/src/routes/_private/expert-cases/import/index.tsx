import { CSV_IMPORT_MAX_ROWS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { Download, FileUp } from 'lucide-react';
import { useRef } from 'react';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CsvImportReport } from './@components/csv-import-report.js';
import { useCsvImport } from './@hooks/use-csv-import.js';
import { downloadCsvTemplate } from './@utils/csv-template.js';

// Importação em lote por CSV (IMP-02): modelo, envio e relatório por linha.
export function CasesImportPage() {
  const { handleFile, result, fileError, isPending } = useCsvImport();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card asPage>
      <CardHeader title={t('import')} description={t('import_expert_cases_description')}>
        <CardAction>
          <Button variant="outline" onClick={downloadCsvTemplate}>
            <Download />
            {t('download_template')}
          </Button>
          <Button disabled={isPending} onClick={() => inputRef.current?.click()}>
            <FileUp />
            {t('choose_csv_file')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-6">
        <Panel size="sm" title={t('csv_format')}>
          <ItemDescription className="line-clamp-none">{t('csv_format_description')}</ItemDescription>
          <ItemDescription className="line-clamp-none">
            {`${t('csv_max_rows')}: ${CSV_IMPORT_MAX_ROWS}`}
          </ItemDescription>
        </Panel>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('choose_csv_file')}
          onChange={handleFile}
        />
        {fileError && (
          <ItemDescription role="alert" className="text-destructive line-clamp-none">
            {fileError}
          </ItemDescription>
        )}
        {isPending ? <DefaultLoading /> : result && <CsvImportReport result={result} />}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-cases/import/')({
  component: CasesImportPage,
  staticData: { title: t('import') },
});
