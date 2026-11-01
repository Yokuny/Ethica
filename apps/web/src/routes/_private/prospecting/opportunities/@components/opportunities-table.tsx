import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { Bookmark } from 'lucide-react';
import { TableIdentity, TableRowAction, TableRowActions, TableStack, TableStatus } from '@/components/data-table.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { OpportunityRecord } from '../../@query/opportunity.js';
import { OPPORTUNITY_STATUS_VARIANT } from '../@utils/opportunity-status.js';

type OpportunitiesTableProps = {
  data: OpportunityRecord[];
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  onConvert: (row: OpportunityRecord) => void;
  onStatus: (row: OpportunityRecord, status: 'new' | 'under_review' | 'discarded') => void;
  onRemove: (row: OpportunityRecord) => void;
  onOpenCase: (row: OpportunityRecord) => void;
};

export function OpportunitiesTable({
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  onConvert,
  onStatus,
  onRemove,
  onOpenCase,
}: OpportunitiesTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('process')}</TableHead>
            <TableHead>{t('class')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('saved_on')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const converted = row.status === 'converted';
            return (
              <TableRow
                key={row.id}
                onClick={() => (converted ? onOpenCase(row) : onConvert(row))}
                className="cursor-pointer"
              >
                <TableCell>
                  <TableIdentity
                    icon={Bookmark}
                    title={row.processNumber}
                    description={[row.court.toUpperCase(), row.courtUnit].filter(Boolean).join(' · ')}
                  />
                </TableCell>
                <TableCell>
                  <TableStack description={row.subjects.slice(0, 2).join(' · ') || undefined}>
                    {row.caseClass ?? '—'}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableStatus variant={OPPORTUNITY_STATUS_VARIANT[row.status]}>{t(row.status)}</TableStatus>
                </TableCell>
                <TableCell>
                  <TableStack tone="muted">{formatDate(row.createdAt)}</TableStack>
                </TableCell>
                <TableCell>
                  <TableRowActions label={t('actions')}>
                    {converted ? (
                      <TableRowAction onClick={() => onOpenCase(row)}>{t('open_expert_case')}</TableRowAction>
                    ) : (
                      <>
                        <TableRowAction onClick={() => onConvert(row)}>{t('convert_into_expert_case')}</TableRowAction>
                        {row.status !== 'under_review' && (
                          <TableRowAction onClick={() => onStatus(row, 'under_review')}>
                            {t('mark_in_analysis')}
                          </TableRowAction>
                        )}
                        {row.status !== 'discarded' && (
                          <TableRowAction onClick={() => onStatus(row, 'discarded')}>{t('discard')}</TableRowAction>
                        )}
                        <TableRowAction variant="destructive" onClick={() => onRemove(row)}>
                          {t('remove')}
                        </TableRowAction>
                      </>
                    )}
                  </TableRowActions>
                </TableCell>
              </TableRow>
            );
          })}
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
