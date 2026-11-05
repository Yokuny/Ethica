import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { DEADLINE_KIND_ITEMS, deadlineSuggestions } from '@/components/deadline-labels.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, SelectField, TextareaField, TextField } from '@/components/form-fields.js';
import { useDeadlineForm } from '@/hooks/useDeadlineForm.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseQuery } from '@/query/case.js';
import type { DeadlineRecord } from '@/query/deadline.js';

const WRITE = '__write__';

type DeadlineFormProps = { caseId: string; deadline?: DeadlineRecord; onClose: () => void };

// New deadline or alert: the approved titles of the service type (AD-190), which also set Prazo or Alerta, or
// "Escrever outro" with the type and the title typed. Editing changes only the title, the date and the notes.
export function DeadlineForm({ caseId, deadline, onClose }: DeadlineFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useDeadlineForm({ caseId, deadline, onDone: onClose });
  const { control, setValue } = form;
  const legalCase = useQuery(caseQuery(caseId)).data;
  const groups = !deadline && legalCase ? deadlineSuggestions(legalCase) : [];
  const [writing, setWriting] = useState(false);
  const [kind, title] = useWatch({ control, name: ['kind', 'title'] });
  const suggested = groups.some((group) => group.kind === kind && group.titles.includes(title));
  const choice = writing ? WRITE : suggested ? `${kind}:${title}` : null;
  const typed = !groups.length || writing;
  const items = [
    ...groups.flatMap((group) => group.titles.map((label) => ({ value: `${group.kind}:${label}`, label }))),
    { value: WRITE, label: t('write_another') },
  ];

  function choose(value: string) {
    setWriting(value === WRITE);
    if (value === WRITE) {
      setValue('title', '');
      return;
    }
    const [chosenKind, ...rest] = value.split(':');
    setValue('kind', chosenKind as 'deadline' | 'alert');
    setValue('title', rest.join(':'), { shouldValidate: true });
  }

  return (
    <FormDialog title={t(deadline ? 'edit_deadline' : 'new_deadline_or_alert')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          {groups.length > 0 && (
            <FormField
              control={control}
              name="title"
              render={() => (
                <FormItem>
                  <FormLabel required>{t('title')}</FormLabel>
                  <Select items={items} value={choice} onValueChange={(value) => value && choose(value)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectGroup key={group.kind}>
                          <SelectLabel>{t(group.kind === 'alert' ? 'alerts' : 'deadlines')}</SelectLabel>
                          {group.titles.map((label) => (
                            <SelectItem key={label} value={`${group.kind}:${label}`}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      <SelectItem value={WRITE}>{t('write_another')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {!typed && <FormMessage />}
                </FormItem>
              )}
            />
          )}
          {typed && !deadline && (
            <SelectField
              control={control}
              name="kind"
              label={t('type')}
              placeholder={t('choose_type')}
              items={DEADLINE_KIND_ITEMS}
            />
          )}
          {typed && (
            <TextField control={control} name="title" label={t('title')} placeholder={t('example_deadline_title')} />
          )}
          <DateField control={control} name="dueDate" label={t('due_date')} placeholder={t('choose_day')} />
          <TextareaField control={control} name="notes" label={t('notes')} placeholder={t('notes_placeholder')} />
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
