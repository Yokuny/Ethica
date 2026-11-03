import { Button } from '@ethica/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { FileSignature, Trash2 } from 'lucide-react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { REPORT_STATUS_VARIANT, reportStatusLabel } from '@/components/report-labels.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportListItem } from '@/query/report.js';

type ReportsTableProps = {
  data: ReportListItem[];
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  onRowClick: (row: ReportListItem) => void;
  // Trash of a draft row; missing for whoever cannot delete.
  onDelete?: (row: ReportListItem) => void;
};

export function ReportsTable({
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  onRowClick,
  onDelete,
}: ReportsTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('process')}</TableHead>
            <TableHead>{t('template')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('updated_on')}</TableHead>
            {onDelete && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} onClick={() => onRowClick(row)} className="cursor-pointer">
              <TableCell>
                <TableIdentity
                  icon={FileSignature}
                  title={row.caseNumber ?? t('expert_case_removed')}
                  description={t(row.type)}
                />
              </TableCell>
              <TableCell>
                <TableStack description={`${row.totalSections} ${t('sections').toLowerCase()}`}>
                  {row.templateName}
                </TableStack>
              </TableCell>
              <TableCell>
                <TableStatus variant={REPORT_STATUS_VARIANT[row.status]}>{reportStatusLabel(row.status)}</TableStatus>
              </TableCell>
              <TableCell>
                <TableStack tone="muted">{formatDate(row.updatedAt)}</TableStack>
              </TableCell>
              {onDelete && (
                <TableCell>
                  {row.status === 'draft' && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t('delete_draft')}
                      title={t('delete_draft')}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(row);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPaginationChange={onPaginationChange}
      />
    </>
  );
}
