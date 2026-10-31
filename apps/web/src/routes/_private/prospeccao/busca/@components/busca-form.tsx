import { DATAJUD_ASSUNTOS_TECNICOS, DATAJUD_TRIBUNAIS, type Justica } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { NumberField, SelectField, TextField } from '@/components/form-fields.js';
import { justicaLabel } from '@/components/pericia-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { useBuscaDatajud } from '../@hooks/use-busca-datajud.js';

// Rótulo com a justiça: "TRT2 · Trabalhista".
const TRIBUNAL_ITEMS = Object.entries(DATAJUD_TRIBUNAIS).flatMap(([justica, tribunais]) =>
  tribunais.map((tribunal) => ({
    value: tribunal,
    label: `${tribunal.toUpperCase()} · ${justicaLabel(justica as Justica)}`,
  })),
);

export function BuscaForm({ state }: { state: ReturnType<typeof useBuscaDatajud> }) {
  const { form, onSubmit, isSearching } = state;
  const tribunal = form.watch('tribunal');
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField
          control={form.control}
          name="tribunal"
          label={t('tribunal')}
          placeholder={t('select')}
          items={TRIBUNAL_ITEMS}
        />
        <TextField
          control={form.control}
          name="numeroProcesso"
          label={t('process_number')}
          placeholder={t('example_process_number')}
        />
        {tribunal.startsWith('trt') && (
          <FormField
            control={form.control}
            name="assuntosTecnicos"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('technical_subjects')}</FormLabel>
                <Select<string, true>
                  multiple
                  items={DATAJUD_ASSUNTOS_TECNICOS.map((value) => ({ value, label: t(value) }))}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? [])}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('technical_subjects_placeholder')}>
                        {(value: string[]) =>
                          value.length === DATAJUD_ASSUNTOS_TECNICOS.length
                            ? `${value.length} ${t('selected_count')}`
                            : value.map((assunto) => t(assunto)).join(', ')
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DATAJUD_ASSUNTOS_TECNICOS.map((assunto) => (
                      <SelectItem key={assunto} value={assunto}>
                        {t(assunto)}
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
          name="orgaoJulgador"
          label={t('judging_body')}
          placeholder={t('example_court_division')}
        />
        <NumberField
          control={form.control}
          name="classeCodigo"
          label={t('class_code')}
          placeholder={t('example_class_code')}
          min={1}
          step={1}
        />
        <NumberField
          control={form.control}
          name="orgaoJulgadorCodigo"
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
