import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useNavigate } from '@tanstack/react-router';
import { Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import { createPasskey } from '@/query/passkey.js';

// APA-03/04 (AD-220): last step of the e-mail key, the office creation and the invite. The passkey is
// required: the session only opens once this device holds it.
export function PasskeySetup({ passkeyToken }: { passkeyToken: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const supported = browserSupportsWebAuthn();

  const activate = async () => {
    setBusy(true);
    setErrorMessage(undefined);
    const error = await createPasskey(passkeyToken);
    setBusy(false);
    if (error) {
      setErrorMessage(error);
      return;
    }
    navigate({ to: '/' });
  };

  return (
    <div className="flex flex-col gap-4">
      <Fingerprint aria-hidden className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <ItemTitle
          // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
          render={<h2 />}
          className="text-xl"
        >
          {t('activate_device_access')}
        </ItemTitle>
        <ItemDescription className="line-clamp-none">{t('activate_device_access_description')}</ItemDescription>
      </div>
      {!supported && (
        <ItemDescription role="alert" className="line-clamp-none text-destructive">
          {t('device_access_unsupported')}
        </ItemDescription>
      )}
      {errorMessage && (
        <ItemDescription role="alert" className="line-clamp-none text-destructive">
          {errorMessage}
        </ItemDescription>
      )}
      <Button size="field" disabled={!supported || busy} onClick={() => void activate()}>
        {t('activate_on_this_device')}
      </Button>
    </div>
  );
}
