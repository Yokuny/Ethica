import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { ChevronLeft as IconLeft, ChevronRight as IconRight } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';

type TablePaginationProps = {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPaginationChange: (state: { pageIndex: number; pageSize: number }) => void;
};

// Counter + arrows: it used to be copied verbatim into the six `@components/*-table.tsx`
// (customers, professionals, spaces, products, conversation, orders). Toda
// the table is server-driven (apps/web/CLAUDE.md), so it only emits the new page —
// never slices data in memory.
function TablePagination({ pageIndex, pageSize, pageCount, onPaginationChange }: TablePaginationProps) {
  return (
    <div
      data-slot="table-pagination"
      // Inside `DataTable` it becomes the panel footer, below a rule.
      className="flex items-center justify-end gap-2 in-data-[slot=data-table]:border-t in-data-[slot=data-table]:px-4 in-data-[slot=data-table]:py-2"
    >
      <ItemDescription className="line-clamp-none">
        {t('page')} {pageIndex + 1} / {Math.max(pageCount, 1)}
      </ItemDescription>
      <Button
        type="button"
        variant="outline"
        onClick={() => onPaginationChange({ pageIndex: pageIndex - 1, pageSize })}
        disabled={pageIndex <= 0}
        aria-label={t('previous_page')}
      >
        <IconLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onPaginationChange({ pageIndex: pageIndex + 1, pageSize })}
        disabled={pageIndex + 1 >= pageCount}
        aria-label={t('next_page')}
      >
        <IconRight className="size-4" />
      </Button>
    </div>
  );
}

export { TablePagination };
