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

// Contador + setas: era copiado verbatim nos seis `@components/*-table.tsx`
// (customers, professionals, spaces, products, conversation, orders). Toda
// tabela é server-driven (apps/web/CLAUDE.md), então só emite a nova página —
// nunca fatia dados em memória.
function TablePagination({ pageIndex, pageSize, pageCount, onPaginationChange }: TablePaginationProps) {
  return (
    <div
      data-slot="table-pagination"
      // Dentro do `DataTable` vira o rodapé do painel, abaixo de um fio.
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
