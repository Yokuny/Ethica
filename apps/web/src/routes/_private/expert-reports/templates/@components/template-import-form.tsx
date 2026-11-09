import { REPORT_TYPES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { FileUp } from 'lucide-react';
import { useRef } from 'react';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { templateAreaItems } from '@/components/report-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { TemplateRecord } from '@/query/report.js';
import { useTemplateImportForm } from '../@hooks/use-template-import-form.js';

type TemplateImportFormProps = { onDone: (template: TemplateRecord) => void; onClose: () => void };

export function TemplateImportForm({ onDone, onClose }: TemplateImportFormProps) {
  const { form, file, chooseFile, onSubmit, isPending, errorMessage } = useTemplateImportForm({ onDone });
  const serviceTypes = useQuery(serviceTypesQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <FormDialog title={t('import_template')} description={t('import_template_description')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <ItemTitle>{t('template_file')}</ItemTitle>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                <FileUp />
                {t('choose_file')}
              </Button>
              {file && <ItemDescription className="truncate">{file.name}</ItemDescription>}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              tabIndex={-1}
              aria-label={t('template_file')}
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </div>
          <TextField
            control={form.control}
            name="name"
            label={t('name')}
            placeholder={t('template_name_placeholder')}
          />
          <SelectField
            control={form.control}
            name="type"
            label={t('document_type')}
            placeholder={t('choose_type')}
            items={REPORT_TYPES.map((value) => ({ value, label: t(value) }))}
          />
          <SelectField
            control={form.control}
            name="area"
            label={t('practice_area')}
            placeholder={t('no_area')}
            items={templateAreaItems(serviceTypes.data ?? [])}
          />
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
              {t('import')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
