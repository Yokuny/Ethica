import { billingPaymentQuerySchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Spinner } from '@ethica/ui/components/spinner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, CircleCheckIcon } from 'lucide-react';
import { useEffect } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent } from '@/components/page-card.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { sessionKeys } from '@/query/session.js';
import { Brand } from '../../../@components/brand.js';
import { billingPaymentQuery, billingQuery } from '../../@query/billing.js';
import { CopyField } from './@components/copy-field.js';

// CHK-12 (AD-251): PIX or boleto of a charge, paid without leaving the Ethica. The charge is read once; the
// plans query keeps asking, and the office opens as soon as the payment is confirmed (webhook or the API check).
export function BillingPaymentPage() {
  const { paymentId } = Route.useParams();
  const { method } = Route.useSearch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const payment = useQuery(billingPaymentQuery(paymentId, method));
  const billing = useQuery(billingQuery);
  const accessUntil = billing.data?.accessUntil;
  const open = Boolean(accessUntil && new Date(accessUntil) > new Date());

  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    navigate({ to: '/' });
  }, [open, queryClient, navigate]);

  const data = payment.data;
  const back = (
    <Button variant="outline" render={<Link to="/billing" />}>
      <ArrowLeftIcon />
      {t('billing_back_to_plans')}
    </Button>
  );

  return (
    <Card>
      <CardContent className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10">
        <nav className="flex items-center justify-between">
          <Brand />
          {back}
        </nav>
        {payment.isLoading ? (
          <DefaultLoading />
        ) : !data ? (
          <DefaultEmptyData
            title={payment.error?.message ?? t('not_found')}
            description={t('billing_choose_another_method')}
            action={back}
          />
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2 text-center">
              <ItemDescription className="justify-center">
                {method === 'pix' ? t('billing_pay_with_pix') : t('billing_pay_with_boleto')}
              </ItemDescription>
              <ItemTitle
                // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                render={<h2 />}
                className="mx-auto justify-center text-4xl font-semibold tracking-tight"
              >
                {formatMoney(data.valueCents)}
              </ItemTitle>
              {data.boleto && (
                <ItemDescription className="justify-center">{`${t('due_date')}: ${formatDate(data.dueDate)}`}</ItemDescription>
              )}
            </div>
            {data.paid ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
                <CircleCheckIcon className="size-8 text-status-success-indicator" aria-hidden />
                <ItemTitle className="justify-center text-base">{t('billing_payment_confirmed')}</ItemTitle>
                <ItemDescription className="line-clamp-none justify-center">
                  {t('billing_pending_help')}
                </ItemDescription>
              </div>
            ) : (
              <div className="flex flex-col gap-6 rounded-xl border p-6">
                {data.pix && (
                  <>
                    <img
                      src={`data:image/png;base64,${data.pix.image}`}
                      alt={t('billing_pix_qr_code')}
                      className="mx-auto size-56 rounded-lg bg-white p-2"
                    />
                    <CopyField label={t('billing_pix_copy_paste')} value={data.pix.code} />
                    <ItemDescription className="line-clamp-none mx-auto text-center text-xs">
                      {`${t('billing_pix_steps')} ${t('billing_valid_until')} ${formatDate(data.pix.expiresAt.slice(0, 10))}.`}
                    </ItemDescription>
                  </>
                )}
                {data.boleto && (
                  <>
                    <CopyField label={t('billing_boleto_line')} value={data.boleto.line} />
                    {data.boleto.pdfUrl && (
                      <Button
                        variant="outline"
                        render={<a href={data.boleto.pdfUrl} target="_blank" rel="noreferrer" />}
                      >
                        {t('billing_open_boleto')}
                      </Button>
                    )}
                    <ItemDescription className="line-clamp-none mx-auto text-center text-xs">
                      {t('billing_boleto_steps')}
                    </ItemDescription>
                  </>
                )}
                <div className="flex items-center justify-center gap-2">
                  <Spinner className="size-4 text-muted-foreground" />
                  <ItemDescription className="line-clamp-none text-center">
                    {t('billing_waiting_payment')}
                  </ItemDescription>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/billing/payment/$paymentId/')({
  component: BillingPaymentPage,
  validateSearch: (search: Record<string, unknown>) => billingPaymentQuerySchema.parse(search),
  staticData: { title: t('subscription') },
});
