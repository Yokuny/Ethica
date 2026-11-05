import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { TablePagination } from '@/components/table-pagination.js';
import type { CaseListItem } from '@/query/case.js';
import { caseColumns } from '../@utils/case-columns.js';

type CasesTableProps = {
  data: CaseListItem[];
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onRowClick: (row: CaseListItem) => void;
  // Amounts only for whoever sees finance (AD-137).
  canSeeFinance: boolean;
};

// Server-driven table (pagination, sort and filters come from the URL), the row opens the detail.
export function CasesTable({
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  onRowClick,
  canSeeFinance,
}: CasesTableProps) {
  const table = useReactTable({
    data,
    columns: caseColumns,
    pageCount,
    state: { pagination: { pageIndex, pageSize }, sorting, columnVisibility: { fees: canSeeFinance } },
    onPaginationChange,
    onSortingChange,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    sortDescFirst: false,
    manualFiltering: true,
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
