import { Button } from '@ethica/ui/components/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileSignature, Pencil, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { REPORT_STATUS_VARIANT, reportStatusLabel } from '@/components/report-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportListItem } from '@/query/report.js';

type Actions = {
  onOpen: (row: ReportListItem) => void;
  onDownload: (row: ReportListItem) => void;
  downloading: boolean;
  // Trash of a draft row; missing for whoever cannot delete.
  onDelete?: (row: ReportListItem) => void;
};

// The button acts without opening the row.
const only = (action: () => void) => (event: React.MouseEvent) => {
  event.stopPropagation();
  action();
};

// Sortable columns (AD-192) have an `accessorFn` and the `id` of the server sort (`REPORT_LIST_SORTS`).
export const reportColumns = ({
  onOpen,
  onDownload,
  downloading,
  onDelete,
}: Actions): ColumnDef<ReportListItem, unknown>[] => [
  {
    id: 'process',
    header: t('process'),
    cell: ({ row }) => (
      <TableIdentity
        icon={FileSignature}
        title={row.original.caseNumber ?? t('expert_case_removed')}
        description={t(row.original.type)}
      />
    ),
  },
  {
    // Same column as the services list: plaintiff on the first line, defendant below.
    id: 'parties',
    header: t('parties'),
    cell: ({ row }) => <TableStack description={row.original.defendant}>{row.original.plaintiff ?? '—'}</TableStack>,
  },
  {
    id: 'court',
    header: t('court_and_division'),
    cell: ({ row }) => <TableStack description={row.original.division}>{row.original.court ?? '—'}</TableStack>,
  },
  {
    id: 'templateName',
    accessorFn: (row) => row.templateName,
    header: t('template'),
    cell: ({ row }) => (
      <TableStack description={`${row.original.totalSections} ${t('sections').toLowerCase()}`}>
        {row.original.templateName}
      </TableStack>
    ),
  },
  {
    id: 'status',
    accessorFn: (row) => row.status,
    header: t('status'),
    cell: ({ row }) => (
      <TableStatus variant={REPORT_STATUS_VARIANT[row.original.status]}>
        {reportStatusLabel(row.original.status)}
      </TableStatus>
    ),
  },
  {
    id: 'updatedAt',
    accessorFn: (row) => row.updatedAt,
    header: t('updated_on'),
    cell: ({ row }) => (
      <TableStack tone="muted" description={row.original.updatedByName}>
        {formatDate(row.original.updatedAt)}
      </TableStack>
    ),
  },
  {
    // Draft actions side by side: open, download the PDF and delete.
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      row.original.status === 'draft' && (
        <div className="flex justify-end gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('edit')}
            title={t('edit')}
            onClick={only(() => onOpen(row.original))}
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('export_pdf')}
            title={t('export_pdf')}
            disabled={downloading}
            onClick={only(() => onDownload(row.original))}
          >
            <Download />
          </Button>
          {onDelete && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="hover:text-destructive"
              aria-label={t('delete_draft')}
              title={t('delete_draft')}
              onClick={only(() => onDelete(row.original))}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      ),
  },
];
