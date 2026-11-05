import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { TablePagination } from '@/components/table-pagination.js';
import type { ReportListItem } from '@/query/report.js';
import { reportColumns } from '../@utils/report-columns.js';

type ReportsTableProps = {
  data: ReportListItem[];
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onRowClick: (row: ReportListItem) => void;
  onDownload: (row: ReportListItem) => void;
  downloading: boolean;
  // Trash of a draft row; missing for whoever cannot delete.
  onDelete?: (row: ReportListItem) => void;
};

// Server-driven table (pagination, sort and filters come from the URL), the row opens the report.
export function ReportsTable({
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  onRowClick,
  onDownload,
  downloading,
  onDelete,
}: ReportsTableProps) {
  const table = useReactTable({
    data,
    columns: reportColumns({ onOpen: onRowClick, onDownload, downloading, onDelete }),
    pageCount,
    state: { pagination: { pageIndex, pageSize }, sorting },
    onPaginationChange,
    onSortingChange,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: false,
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  sort={
                    header.column.getCanSort()
                      ? { direction: header.column.getIsSorted(), onToggle: header.column.getToggleSortingHandler() }
                      : undefined
                  }
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} onClick={() => onRowClick(row.original)} className="cursor-pointer">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
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
