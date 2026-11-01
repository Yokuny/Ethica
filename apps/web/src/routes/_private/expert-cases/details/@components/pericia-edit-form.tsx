import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PericiaFormFields } from '../../@components/pericia-form-fields.js';
import { usePericiaEditForm } from '../@hooks/use-pericia-edit-form.js';
import type { PericiaEditFormProps } from '../@interface/pericia-details.interface.js';

export function PericiaEditForm({ pericia, onSaved, onCancel }: PericiaEditFormProps) {
  const { form, onSubmit, isPending, errorMessage } = usePericiaEditForm({ pericia, onSaved });
  const formActions = (
    <>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        {t('cancel')}
      </Button>
      <Button type="submit" disabled={isPending}>
        {t('save')}
      </Button>
    </>
  );
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="contents">
        <CardHeader title={t('details')}>
          <CardAction>{formActions}</CardAction>
        </CardHeader>
        <CardContent>
          <PericiaFormFields control={form.control} editing />
          {errorMessage && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {errorMessage}
            </ItemDescription>
          )}
        </CardContent>
        <CardFooter>
          <CardAction>{formActions}</CardAction>
        </CardFooter>
      </form>
    </Form>
  );
}
