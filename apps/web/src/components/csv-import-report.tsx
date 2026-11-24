import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { CircleAlert, CircleMinus } from 'lucide-react';
import { RecordStat, RecordStats } from '@/components/record.js';
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
      <section aria-label={t('lines_not_imported')} className="grid gap-3">
        <ItemTitle role="heading" aria-level={2} className="text-base">
          {t('lines_not_imported')}
        </ItemTitle>
        {rows.length ? (
          <ItemGroup>
            {rows.map((row) => (
              <Item key={row.line} render={<li />}>
                <ItemMedia
                  variant="icon"
                  role="img"
                  aria-label={row.declined ? t('rejected') : t('skipped')}
                  className={row.declined ? 'text-destructive' : 'text-status-warning-foreground'}
                >
                  {row.declined ? <CircleAlert /> : <CircleMinus />}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="tabular-nums">{`${t('line')} ${row.line}`}</ItemTitle>
                  <ItemDescription className="line-clamp-none">{row.reason}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <ItemDescription>{t('all_lines_imported')}</ItemDescription>
        )}
      </section>
    </div>
  );
}
