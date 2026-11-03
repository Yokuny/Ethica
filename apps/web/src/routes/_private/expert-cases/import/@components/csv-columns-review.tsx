import { CSV_IMPORT_FIELDS, type CsvImportField } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Check, CircleAlert } from 'lucide-react';
import { RecordTable, RecordTableCell, RecordTableMedia, RecordTableRow } from '@/components/record.js';
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
      <RecordTable title={t('check_columns')} actions={<Button onClick={onSubmit}>{t('import')}</Button>}>
        {columns.map((column, index) => (
          <RecordTableRow
            // biome-ignore lint/suspicious/noArrayIndexKey: the columns are the fixed order of the spreadsheet, and a header may repeat.
            key={index}
            media={
              <RecordTableMedia
                variant={column.certain ? 'success' : 'warning'}
                label={column.certain ? t('recognized') : t('not_recognized')}
              >
                {column.certain ? <Check /> : <CircleAlert />}
              </RecordTableMedia>
            }
          >
            <RecordTableCell
              label={t('column')}
              value={column.certain ? column.header : `! ${column.header}`}
              className="w-1/3"
            />
            <RecordTableCell label={t('example')} value={column.sample ?? '-'} className="w-1/3" />
            <td className="min-w-48">
              <div className="flex flex-col gap-1">
                <ItemDescription className="line-clamp-none">{t('field')}</ItemDescription>
                <Select
                  items={FIELD_ITEMS}
                  value={fields[index]}
                  onValueChange={(next) => next && onFieldChange(index, next as CsvImportField)}
                >
                  <SelectTrigger className="w-full" aria-label={`${t('field')}: ${column.header}`}>
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
              </div>
            </td>
          </RecordTableRow>
        ))}
      </RecordTable>
    </div>
  );
}
