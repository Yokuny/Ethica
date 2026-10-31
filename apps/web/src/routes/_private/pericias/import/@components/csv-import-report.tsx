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
import type { CsvImportResult } from '../../@query/importacao.js';

// Relatório do lote (IMP-02.2): quantas foram criadas, ignoradas e recusadas, e o motivo por linha.
export function CsvImportReport({ result }: { result: CsvImportResult }) {
  const linhas = [
    ...result.rejected.map((item) => ({
      line: item.line,
      recusada: true,
      motivo: item.column ? `${item.column}: ${t(item.reason)}` : t(item.reason),
    })),
    ...result.skipped.map((item) => ({
      line: item.line,
      recusada: false,
      motivo: `${item.numeroProcesso}: ${t('expert_case_already_registered')}`,
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
        {linhas.map((linha) => (
          <RecordTableRow
            key={linha.line}
            media={
              <RecordTableMedia
                variant={linha.recusada ? 'error' : 'warning'}
                label={linha.recusada ? t('rejected') : t('skipped')}
              >
                {linha.recusada ? <CircleAlert /> : <CircleMinus />}
              </RecordTableMedia>
            }
          >
            <RecordTableCell label={t('line')} value={String(linha.line)} className="w-24" />
            <RecordTableCell label={t('reason')} value={linha.motivo} />
          </RecordTableRow>
        ))}
      </RecordTable>
    </div>
  );
}
