import type { BillingPlan, BillingView } from '@ethica/contracts';
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
});

export function payPlan(plan: BillingPlan) {
  return post<{ url: string }>('/billing/pay', { plan });
}
