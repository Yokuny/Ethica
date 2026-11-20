import type { BillingPlan } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { clearDevice } from '@/lib/offline/store.js';
import { sessionKeys } from '@/query/session.js';
import { BillingPlans } from './@components/billing-plans.js';
import { billingQuery, payPlan } from './@query/billing.js';

// Destination of the _private guard when GET /auth/session answers `tenant_suspended`: a new sign-up
// before its first payment, the paid access over (AD-230) or the office suspended by the platform.
// Paying opens the Asaas invoice; the access comes back when Asaas confirms the payment. Signing out
// does not go through validToken, so it works with the office closed.
export function BillingPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const billing = useQuery(billingQuery);
  const [paying, setPaying] = useState<BillingPlan>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const view = billing.data;
  const open = Boolean(view?.accessUntil && new Date(view.accessUntil) > new Date());

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

  // CHK-05: confirmed payment — the office is open again, enter it (the session is read anew).
  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    navigate({ to: '/' });
  }, [open, queryClient, navigate]);

  const signOutButton = (
    <Button variant="outline" onClick={() => void signOut()}>
      {t('sign_out')}
    </Button>
  );

  return (
    <Card>
      <CardHeader title={t('subscription')} />
      <CardContent className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8">
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
            <div className="space-y-4 text-center">
              <ItemTitle
                // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                render={<h2 />}
                className="mx-auto justify-center text-4xl font-medium tracking-tight text-balance lg:text-5xl"
              >
                {view.firstPayment ? t('choose_plan') : t('tenant_suspended')}
              </ItemTitle>
              <ItemDescription className="line-clamp-none lg:text-lg">
                {!view.canPay
                  ? t('billing_admin_only')
                  : view.firstPayment
                    ? t('billing_first_payment_help')
                    : t('billing_expired_help')}
              </ItemDescription>
            </div>
            <BillingPlans
              trialAvailable={view.trialAvailable}
              paying={paying}
              onPay={view.canPay ? (plan) => void pay(plan) : undefined}
            />
            {errorMessage && (
              <ItemDescription role="alert" className="line-clamp-none text-center text-destructive">
                {errorMessage}
              </ItemDescription>
            )}
            <div className="flex flex-col items-center gap-4">
              <ItemDescription className="line-clamp-none text-center">{t('billing_pending_help')}</ItemDescription>
              {signOutButton}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/billing/')({
  component: BillingPage,
  staticData: { title: t('subscription') },
});
