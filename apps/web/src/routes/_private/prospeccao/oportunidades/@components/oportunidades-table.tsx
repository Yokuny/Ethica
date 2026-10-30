import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { Bookmark } from 'lucide-react';
import { TableIdentity, TableRowAction, TableRowActions, TableStack, TableStatus } from '@/components/data-table.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { OportunidadeRecord } from '../../@query/oportunidade.js';
import { OPORTUNIDADE_STATUS_VARIANT } from '../@utils/oportunidade-status.js';

type OportunidadesTableProps = {
  data: OportunidadeRecord[];
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  onConvert: (row: OportunidadeRecord) => void;
  onStatus: (row: OportunidadeRecord, status: 'nova' | 'em_analise' | 'descartada') => void;
  onRemove: (row: OportunidadeRecord) => void;
  onOpenPericia: (row: OportunidadeRecord) => void;
};

export function OportunidadesTable({
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  onConvert,
  onStatus,
  onRemove,
  onOpenPericia,
}: OportunidadesTableProps) {
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
            const convertida = row.status === 'convertida';
            return (
              <TableRow
                key={row.id}
                onClick={() => (convertida ? onOpenPericia(row) : onConvert(row))}
                className="cursor-pointer"
              >
                <TableCell>
                  <TableIdentity
                    icon={Bookmark}
                    title={row.numeroProcesso}
                    description={[row.tribunal.toUpperCase(), row.orgaoJulgador].filter(Boolean).join(' · ')}
                  />
                </TableCell>
                <TableCell>
                  <TableStack description={row.assuntos.slice(0, 2).join(' · ') || undefined}>
                    {row.classe ?? '—'}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableStatus variant={OPORTUNIDADE_STATUS_VARIANT[row.status]}>{t(row.status)}</TableStatus>
                </TableCell>
                <TableCell>
                  <TableStack tone="muted">{formatDate(row.createdAt)}</TableStack>
                </TableCell>
                <TableCell>
                  <TableRowActions label={t('actions')}>
                    {convertida ? (
                      <TableRowAction onClick={() => onOpenPericia(row)}>{t('open_pericia')}</TableRowAction>
                    ) : (
                      <>
                        <TableRowAction onClick={() => onConvert(row)}>{t('convert_into_pericia')}</TableRowAction>
                        {row.status !== 'em_analise' && (
                          <TableRowAction onClick={() => onStatus(row, 'em_analise')}>
                            {t('mark_in_analysis')}
                          </TableRowAction>
                        )}
                        {row.status !== 'descartada' && (
                          <TableRowAction onClick={() => onStatus(row, 'descartada')}>{t('discard')}</TableRowAction>
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
