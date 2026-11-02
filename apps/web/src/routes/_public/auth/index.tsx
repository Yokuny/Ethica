import { createFileRoute, useSearch } from '@tanstack/react-router';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AccessCodeForm } from './@components/access-code-form.js';
import { AccessEmailForm } from './@components/access-email-form.js';
import { AccessOfficeForm } from './@components/access-office-form.js';
import { useAccess } from './@hooks/use-access.js';
import { authSearchSchema } from './@interface/auth.interface.js';

// AD-155: no password — access and sign-up by the key sent to the person's e-mail.
export function AuthPage() {
  const { token } = useSearch({ strict: false }) as { token?: string };
  const access = useAccess(token);

  return (
    <Card asPage="public">
      <CardHeader className="mx-auto w-full max-w-sm" title={t('sign_in')} />
      <CardContent className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {access.step === 'checking' && <DefaultLoading />}
        {access.step === 'email' && (
          <AccessEmailForm form={access.emailForm} errorMessage={access.errorMessage} onSubmit={access.onSubmitEmail} />
        )}
        {access.step === 'code' && (
          <AccessCodeForm
            form={access.codeForm}
            email={access.email}
            errorMessage={access.errorMessage}
            onSubmit={access.onSubmitCode}
            onResend={access.resend}
            onChangeEmail={access.changeEmail}
          />
        )}
        {access.step === 'office' && (
          <AccessOfficeForm
            form={access.officeForm}
            email={access.email}
            errorMessage={access.errorMessage}
            onSubmit={access.onSubmitOffice}
          />
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/auth/')({
  component: AuthPage,
  staticData: { title: t('sign_in') },
  validateSearch: (search: Record<string, unknown>) => authSearchSchema.parse(search),
});
