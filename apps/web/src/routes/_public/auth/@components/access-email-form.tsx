import type { AccessKeyRequest } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Fingerprint } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';

type AccessEmailFormProps = {
  form: UseFormReturn<AccessKeyRequest>;
  signingUp: boolean;
  errorMessage?: string;
  onSubmit: (data: AccessKeyRequest) => Promise<void>;
  onSigninWithDevice: () => Promise<void>;
  onToggleSignup: () => void;
};

// APA-02: a device with passkey signs in right away; otherwise the e-mail key. CHK-01: "Criar conta"
// asks only the e-mail too — the office and the plan come after the key.
export function AccessEmailForm({
  form,
  signingUp,
  errorMessage,
  onSubmit,
  onSigninWithDevice,
  onToggleSignup,
}: AccessEmailFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {signingUp ? (
          <div className="flex flex-col gap-1">
            <ItemTitle>{t('create_account')}</ItemTitle>
            <ItemDescription className="line-clamp-none">{t('signup_help')}</ItemDescription>
          </div>
        ) : (
          <>
            <Button type="button" size="field" onClick={() => void onSigninWithDevice()}>
              <Fingerprint />
              {t('sign_in_with_device')}
            </Button>
            <ItemDescription className="text-center">{t('or_by_email')}</ItemDescription>
          </>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="email"
                  aria-label={t('email')}
                  autoComplete="username webauthn"
                  placeholder={t('email')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errorMessage && (
          <ItemDescription role="alert" className="line-clamp-none text-destructive">
            {errorMessage}
          </ItemDescription>
        )}
        <Button type="submit" variant="outline" size="field" disabled={form.formState.isSubmitting}>
          {t('send_access_key')}
        </Button>
        <Button type="button" variant="ghost" size="field" onClick={onToggleSignup}>
          {signingUp ? t('already_have_account') : t('create_account')}
        </Button>
      </form>
    </Form>
  );
}
