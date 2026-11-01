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
import type { CsvImportResult } from '../../@query/import.js';

// Relatório do lote (IMP-02.2): quantas foram criadas, ignoradas e recusadas, e o motivo por linha.
export function CsvImportReport({ result }: { result: CsvImportResult }) {
  const rows = [
    ...result.rejected.map((item) => ({
      line: item.line,
      recusada: true,
      reason: item.column ? `${item.column}: ${t(item.reason)}` : t(item.reason),
    })),
    ...result.skipped.map((item) => ({
      line: item.line,
      recusada: false,
      reason: `${item.processNumber}: ${t('expert_case_already_registered')}`,
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
                variant={row.recusada ? 'error' : 'warning'}
                label={row.recusada ? t('rejected') : t('skipped')}
              >
                {row.recusada ? <CircleAlert /> : <CircleMinus />}
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
