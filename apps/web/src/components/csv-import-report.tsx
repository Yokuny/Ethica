import { CircleAlert, CircleMinus } from 'lucide-react';
import {
  RecordStat,
  RecordStats,
  RecordTable,
  RecordTableCell,
  RecordTableMedia,
  RecordTableRow,
} from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Spreadsheet import result (AD-118): skipped rows were already registered; `label` names the record.
export type CsvImportReportData = {
  created: number;
  skipped: { line: number; label: string }[];
  rejected: { line: number; column?: string; reason: string }[];
};

// Batch report (IMP-02.2, VAR-02): how many were created, skipped and rejected, and the reason per row.
export function CsvImportReport({ result, skippedReason }: { result: CsvImportReportData; skippedReason: string }) {
  const rows = [
    ...result.rejected.map((item) => ({
      line: item.line,
      declined: true,
      reason: item.column ? `${item.column}: ${t(item.reason)}` : t(item.reason),
    })),
    ...result.skipped.map((item) => ({
      line: item.line,
      declined: false,
      reason: `${item.label}: ${skippedReason}`,
    })),
  ].sort((a, b) => a.line - b.line);

  return (
    <div className="grid gap-6">
      <RecordStats>
        <RecordStat label={t('created_plural')} value={String(result.created)} />
        <RecordStat label={t('skipped_plural')} value={String(result.skipped.length)} />
        <RecordStat label={t('rejected_plural')} value={String(result.rejected.length)} />
      </RecordStats>
      <RecordTable title={t('lines_not_imported')} empty={t('all_lines_imported')}>
        {rows.map((row) => (
          <RecordTableRow
            key={row.line}
            media={
              <RecordTableMedia
                variant={row.declined ? 'error' : 'warning'}
                label={row.declined ? t('rejected') : t('skipped')}
              >
                {row.declined ? <CircleAlert /> : <CircleMinus />}
              </RecordTableMedia>
            }
          >
            <RecordTableCell label={t('line')} value={String(row.line)} className="w-24" />
            <RecordTableCell label={t('reason')} value={row.reason} />
          </RecordTableRow>
        ))}
      </RecordTable>
    </div>
  );
}
