import { CSV_IMPORT_FIELDS, type CsvImportField } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Check, CircleAlert } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CsvColumn } from '../../@query/import.js';
import { CSV_FIELD_LABEL } from '../@consts/field-labels.js';

const FIELD_ITEMS = CSV_IMPORT_FIELDS.map((value) => ({ value, label: t(CSV_FIELD_LABEL[value]) }));

// Each spreadsheet column with the field it goes to (RSV-04); the ones not recognized for sure show "!".
export function CsvColumnsReview({
  columns,
  fields,
  onFieldChange,
  onSubmit,
}: {
  columns: CsvColumn[];
  fields: CsvImportField[];
  onFieldChange: (index: number, field: CsvImportField) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4">
      <ItemDescription className="line-clamp-none">{t('check_columns_description')}</ItemDescription>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ItemTitle role="heading" aria-level={2} className="text-base">
          {t('check_columns')}
        </ItemTitle>
        <Button onClick={onSubmit}>{t('import')}</Button>
      </div>
      <ItemGroup>
        {columns.map((column, index) => (
          <Item
            // biome-ignore lint/suspicious/noArrayIndexKey: the columns are the fixed order of the spreadsheet, and a header may repeat.
            key={index}
            render={<li />}
          >
            <ItemMedia
              variant="icon"
              role="img"
              aria-label={column.certain ? t('recognized') : t('not_recognized')}
              className={column.certain ? 'text-status-success-foreground' : 'text-status-warning-foreground'}
            >
              {column.certain ? <Check /> : <CircleAlert />}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{column.certain ? column.header : `! ${column.header}`}</ItemTitle>
              <ItemDescription>{`${t('example')}: ${column.sample ?? '-'}`}</ItemDescription>
            </ItemContent>
            <ItemActions className="w-full sm:w-auto">
              <Select
                items={FIELD_ITEMS}
                value={fields[index]}
                onValueChange={(next) => next && onFieldChange(index, next as CsvImportField)}
              >
                <SelectTrigger className="w-full sm:w-64" aria-label={`${t('field')}: ${column.header}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}
