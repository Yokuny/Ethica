import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { FileSignature } from 'lucide-react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { LAUDO_STATUS_VARIANT, laudoStatusLabel } from '@/components/laudo-labels.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LaudoListItem } from '@/query/laudo.js';

type LaudosTableProps = {
  data: LaudoListItem[];
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  onRowClick: (row: LaudoListItem) => void;
};

export function LaudosTable({
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  onRowClick,
}: LaudosTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('process')}</TableHead>
            <TableHead>{t('template')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('updated_on')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} onClick={() => onRowClick(row)} className="cursor-pointer">
              <TableCell>
                <TableIdentity
                  icon={FileSignature}
                  title={row.periciaNumero ?? t('expert_case_removed')}
                  description={t(row.tipo)}
                />
              </TableCell>
              <TableCell>
                <TableStack description={`${row.totalSecoes} ${t('sections').toLowerCase()}`}>
                  {row.modeloNome}
                </TableStack>
              </TableCell>
              <TableCell>
                <TableStatus variant={LAUDO_STATUS_VARIANT[row.status]}>{laudoStatusLabel(row.status)}</TableStatus>
              </TableCell>
              <TableCell>
                <TableStack tone="muted">{formatDate(row.updatedAt)}</TableStack>
              </TableCell>
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
