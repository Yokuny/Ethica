import type {
  BillingCharge,
  BillingPaymentQuery,
  BillingPaymentView,
  BillingPlan,
  BillingView,
} from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get, post } from '@/lib/api/client.api.js';

// AD-230: reachable with the office closed — it is how the office pays.
export const billingQuery = queryOptions({
  queryKey: ['billing'] as const,
  queryFn: async (): Promise<BillingView> => {
    const res = await get<BillingView>('/billing');
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  },
  retry: false,
  // Back from the invoice, or on the PIX/boleto screen: keep asking until the access opens. The API checks
  // Asaas itself when the webhook is late (AD-251).
  refetchInterval: 10_000,
});

// AD-251: the PIX or boleto of a charge; read once, the payment itself is followed by `billingQuery`.
export const billingPaymentQuery = (id: string, method: BillingPaymentQuery['method']) =>
  queryOptions({
    queryKey: ['billing', 'payment', id, method] as const,
    queryFn: async (): Promise<BillingPaymentView> => {
      const res = await get<BillingPaymentView>(`/billing/payments/${id}?method=${method}`);
      if (!res.success || !res.data) throw new Error(res.message);
      return res.data;
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

export function payPlan(plan: BillingPlan) {
  return post<BillingCharge>('/billing/pay', { plan });
}
