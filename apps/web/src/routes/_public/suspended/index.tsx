import type { BillingPlan } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { clearDevice } from '@/lib/offline/store.js';
import { BillingPlans } from './@components/billing-plans.js';
import { billingQuery, payPlan } from './@query/billing.js';

// Destination of the _private guard when GET /auth/session answers `tenant_suspended`: a new sign-up
// before its first payment, the paid access over (AD-230) or the office suspended by the platform.
// Paying opens the Asaas invoice; the access comes back when Asaas confirms the payment. Signing out
// does not go through validToken, so it works with the office closed.
export function SuspendedPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const billing = useQuery(billingQuery);
  const [paying, setPaying] = useState<BillingPlan>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const view = billing.data;

  const signOut = async () => {
    await post('/auth/signout');
    queryClient.clear();
    void clearDevice();
    navigate({ to: '/auth' });
  };

  const pay = async (plan: BillingPlan) => {
    setErrorMessage(undefined);
    setPaying(plan);
    const response = await payPlan(plan);
    if (!response.success || !response.data) {
      setErrorMessage(response.message || t('action_error'));
      setPaying(undefined);
      return;
    }
    window.location.assign(response.data.url);
  };

  const signOutButton = (
    <Button variant="outline" onClick={() => void signOut()}>
      {t('sign_out')}
    </Button>
  );

  return (
    <Card>
      <CardHeader
        className="mx-auto w-full max-w-lg"
        title={view?.firstPayment ? t('choose_plan') : t('tenant_suspended')}
      />
      <CardContent className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6">
        {billing.isLoading ? (
          <DefaultLoading />
        ) : !view ? (
          <DefaultEmptyData
            title={t('tenant_suspended')}
            description={t('tenant_suspended_help')}
            action={signOutButton}
          />
        ) : (
          <>
            <ItemDescription className="line-clamp-none">
              {!view.canPay
                ? t('billing_admin_only')
                : view.firstPayment
                  ? t('billing_first_payment_help')
                  : t('billing_expired_help')}
            </ItemDescription>
            {view.canPay && (
              <BillingPlans trialAvailable={view.trialAvailable} paying={paying} onPay={(plan) => void pay(plan)} />
            )}
            {errorMessage && (
              <ItemDescription role="alert" className="line-clamp-none text-destructive">
                {errorMessage}
              </ItemDescription>
            )}
            <ItemDescription className="line-clamp-none">{t('billing_pending_help')}</ItemDescription>
            <div>{signOutButton}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/suspended/')({
  component: SuspendedPage,
  staticData: { title: t('tenant_suspended') },
});
