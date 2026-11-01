import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CaseFormFields } from '../../@components/case-form-fields.js';
import { useCaseEditForm } from '../@hooks/use-case-edit-form.js';
import type { CaseEditFormProps } from '../@interface/case-details.interface.js';

export function CaseEditForm({ legalCase, onSaved, onCancel }: CaseEditFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useCaseEditForm({ legalCase, onSaved });
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
          <CaseFormFields control={form.control} editing />
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
