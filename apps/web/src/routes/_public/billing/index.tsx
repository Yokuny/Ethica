import type { BillingPlan } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent } from '@/components/page-card.js';
import { post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { clearDevice } from '@/lib/offline/store.js';
import { sessionKeys } from '@/query/session.js';
import { Brand } from '../@components/brand.js';
import { BillingCompare } from './@components/billing-compare.js';
import { BillingFaq } from './@components/billing-faq.js';
import { BillingHighlights } from './@components/billing-highlights.js';
import { BillingPlans } from './@components/billing-plans.js';
import { PLAN_OPTIONS } from './@consts/plans.js';
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
  const options = PLAN_OPTIONS.filter((option) => option.plan !== 'trial' || view?.trialAvailable);
  const onPay = view?.canPay ? (plan: BillingPlan) => void pay(plan) : undefined;

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

  // Page in the Vercel pricing model (AD-250): bar with the brand and Sair, the plans carousel, what holds
  // for every plan, the comparison, help with the questions; the footer comes from the _public layout.
  return (
    <Card>
      <CardContent className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 lg:gap-24">
        <nav className="flex items-center justify-between">
          <Brand />
          {signOutButton}
        </nav>
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
            <div className="-mt-4 space-y-4 text-center lg:-mt-8">
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
            <BillingPlans options={options} paying={paying} onPay={onPay} />
            {errorMessage && (
              <ItemDescription role="alert" className="line-clamp-none text-center text-destructive">
                {errorMessage}
              </ItemDescription>
            )}
            <ItemDescription className="line-clamp-none -mt-8 text-center text-xs lg:-mt-16">
              {`${t('billing_prices_note')} ${t('billing_pending_help')}`}
            </ItemDescription>
            <BillingHighlights />
            <BillingCompare options={options} paying={paying} onPay={onPay} />
            <BillingFaq trialAvailable={view.trialAvailable} />
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
