import { type CourtType, DATAJUD_COURTS, DATAJUD_TECHNICAL_SUBJECTS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { courtTypeLabel } from '@/components/case-labels.js';
import { NumberField, SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { useSearchDatajud } from '../@hooks/use-search-datajud.js';

// Rótulo com a justiça: "TRT2 · Trabalhista".
const COURT_ITEMS = Object.entries(DATAJUD_COURTS).flatMap(([courtType, courts]) =>
  courts.map((court) => ({
    value: court,
    label: `${court.toUpperCase()} · ${courtTypeLabel(courtType as CourtType)}`,
  })),
);

export function SearchForm({ state }: { state: ReturnType<typeof useSearchDatajud> }) {
  const { form, onSubmit, isSearching } = state;
  const court = form.watch('court');
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField
          control={form.control}
          name="court"
          label={t('court')}
          placeholder={t('select')}
          items={COURT_ITEMS}
        />
        <TextField
          control={form.control}
          name="processNumber"
          label={t('process_number')}
          placeholder={t('example_process_number')}
        />
        {court.startsWith('trt') && (
          <FormField
            control={form.control}
            name="technicalSubjects"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('technical_subjects')}</FormLabel>
                <Select<string, true>
                  multiple
                  items={DATAJUD_TECHNICAL_SUBJECTS.map((value) => ({ value, label: t(value) }))}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? [])}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('technical_subjects_placeholder')}>
                        {(value: string[]) =>
                          value.length === DATAJUD_TECHNICAL_SUBJECTS.length
                            ? `${value.length} ${t('selected_count')}`
                            : value.map((subject) => t(subject)).join(', ')
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DATAJUD_TECHNICAL_SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {t(subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <TextField
          control={form.control}
          name="termo"
          label={t('search_term')}
          placeholder={t('example_search_term')}
        />
        <TextField
          control={form.control}
          name="courtUnit"
          label={t('judging_body')}
          placeholder={t('example_court_division')}
        />
        <NumberField
          control={form.control}
          name="caseClassCode"
          label={t('class_code')}
          placeholder={t('example_class_code')}
          min={1}
          step={1}
        />
        <NumberField
          control={form.control}
          name="courtUnitCode"
          label={t('judging_body_code')}
          placeholder={t('example_judging_body_code')}
          min={1}
          step={1}
        />
        <Button type="submit" size="field" disabled={isSearching}>
          {t('run_search')}
        </Button>
      </form>
      <ItemDescription className="mt-3 line-clamp-none text-xs">{t('technical_subjects_description')}</ItemDescription>
      <ItemDescription className="mt-1 line-clamp-none text-xs">{t('datajud_filter_types')}</ItemDescription>
    </Form>
  );
}
