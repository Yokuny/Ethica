import { LAUDO_NIVEL_MAX } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Checkbox } from '@/components/checkbox.js';
import { FormDialog } from '@/components/form-dialog.js';
import { TextField } from '@/components/form-fields.js';
import { RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ModeloSecaoRecord } from '@/query/laudo.js';
import { useModeloSecaoForm } from '../@hooks/use-modelo-secao-form.js';

const NIVEIS = Array.from({ length: LAUDO_NIVEL_MAX }, (_, i) => ({
  value: String(i + 1),
  label: `${t('level')} ${i + 1}`,
}));

type ModeloSecaoFormProps = { modeloId: string; secao?: ModeloSecaoRecord; onClose: () => void };

export function ModeloSecaoForm({ modeloId, secao, onClose }: ModeloSecaoFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useModeloSecaoForm({ modeloId, secao, onDone: onClose });
  const { control } = form;
  const apenasTitulo = form.watch('apenasTitulo');

  return (
    <FormDialog title={t(secao ? 'edit_section' : 'new_section')} size="lg" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <TextField
              control={control}
              name="titulo"
              label={t('section_title')}
              placeholder={t('section_title_placeholder')}
            />
            <FormField
              control={control}
              name="nivel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('level')}</FormLabel>
                  <Select
                    items={NIVEIS}
                    value={String(field.value)}
                    onValueChange={(value) => value && field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('level')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NIVEIS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <FormField
              control={control}
              name="apenasTitulo"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  label={t('title_only')}
                />
              )}
            />
            <FormField
              control={control}
              name="quebraPagina"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  label={t('page_break_before')}
                />
              )}
            />
          </div>
          {!apenasTitulo &&
            (['textoSim', 'textoNao'] as const).map((name) => (
              <FormField
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(name === 'textoSim' ? 'yes_text' : 'no_text')}</FormLabel>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      label={t(name === 'textoSim' ? 'yes_text' : 'no_text')}
                    />
                  </FormItem>
                )}
              />
            ))}
          {errorMessage && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {errorMessage}
            </ItemDescription>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
