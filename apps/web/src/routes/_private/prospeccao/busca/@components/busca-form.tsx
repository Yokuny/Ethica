import { DATAJUD_TRIBUNAIS, type Justica } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { SelectField, TextField } from '@/components/form-fields.js';
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
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="grid items-end gap-4 sm:grid-cols-[14rem_1fr_1fr_auto]">
        <SelectField
          control={form.control}
          name="tribunal"
          label={t('tribunal')}
          placeholder={t('select')}
          items={TRIBUNAL_ITEMS}
        />
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
          placeholder={t('example_vara')}
        />
        <Button type="submit" size="field" disabled={isSearching}>
          {t('run_search')}
        </Button>
      </form>
    </Form>
  );
}
