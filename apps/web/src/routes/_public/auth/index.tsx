import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { SignInForm } from './@components/sign-in-form.js';
import { useSignInForm } from './@hooks/use-sign-in-form.js';
import { authSearchSchema } from './@interface/auth.interface.js';

export function AuthPage() {
  const { form, errorMessage, onSubmit } = useSignInForm();

  return (
    <Card asPage="public">
      <CardHeader className="mx-auto w-full max-w-sm" title={t('sign_in')} />
      <CardContent className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <SignInForm form={form} errorMessage={errorMessage} onSubmit={onSubmit} />
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/auth/')({
  component: AuthPage,
  staticData: { title: t('sign_in') },
  validateSearch: (search: Record<string, unknown>) => authSearchSchema.parse(search),
});
