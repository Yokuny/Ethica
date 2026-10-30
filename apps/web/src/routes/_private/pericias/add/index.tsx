import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PericiaFormFields } from '../@components/pericia-form-fields.js';
import { usePericiaForm } from './@hooks/use-pericia-form.js';

export function PericiaAddPage() {
  const { form, onSubmit, isPending, errorMessage } = usePericiaForm();
  const formActions = (
    <Button type="submit" disabled={isPending}>
      {t('save')}
    </Button>
  );

  return (
    <Card asPage>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="contents">
          <CardHeader title={t('new_pericia')}>
            <CardAction>{formActions}</CardAction>
          </CardHeader>
          <CardContent>
            <PericiaFormFields control={form.control} />
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
    </Card>
  );
}

export const Route = createFileRoute('/_private/pericias/add/')({
  component: PericiaAddPage,
  staticData: { title: t('new_pericia') },
});
