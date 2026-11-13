import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent } from '@/components/page-card.js';
import { PasskeySetup } from '@/components/passkey-setup.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AccessCodeForm } from './@components/access-code-form.js';
import { AccessEmailForm } from './@components/access-email-form.js';
import { AccessOfficeForm } from './@components/access-office-form.js';
import { AuthShowcase } from './@components/auth-showcase.js';
import { useAccess } from './@hooks/use-access.js';
import { authSearchSchema } from './@interface/auth.interface.js';

// AD-155: no password — access and sign-up by the key sent to the person's e-mail.
// AD-220: the session is born from the passkey of this device; two columns with the product beside.
// On the phone: one centered column, the showcase below the form.
export function AuthPage() {
  const { token } = useSearch({ strict: false }) as { token?: string };
  const access = useAccess(token);

  return (
    <Card>
      <CardContent className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div className="flex flex-col items-center gap-10 text-center lg:items-start lg:text-left">
          <div className="flex flex-col gap-4">
            <ItemTitle
              // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
              render={<h1 />}
              className="text-3xl leading-10 font-medium sm:text-4xl sm:leading-12 lg:text-5xl"
            >
              {t('auth_headline')}
            </ItemTitle>
            <ItemDescription className="line-clamp-none leading-tight text-lg">{t('auth_subheadline')}</ItemDescription>
          </div>
          <div className="w-full max-w-sm">
            {access.step === 'checking' && <DefaultLoading />}
            {access.step === 'email' && (
              <AccessEmailForm
                form={access.emailForm}
                errorMessage={access.errorMessage}
                onSubmit={access.onSubmitEmail}
                onSigninWithDevice={access.signinWithDevice}
              />
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
            {access.step === 'passkey' && <PasskeySetup passkeyToken={access.passkeyToken} />}
          </div>
        </div>
        <AuthShowcase />
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/auth/')({
  component: AuthPage,
  staticData: { title: t('sign_in') },
  validateSearch: (search: Record<string, unknown>) => authSearchSchema.parse(search),
});
