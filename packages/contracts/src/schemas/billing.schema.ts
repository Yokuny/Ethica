import { z } from 'zod';

// AD-230: the office pays the Ethica subscription in Asaas. Each confirmed payment extends the
// office access; `trial` once, the first month without renewal (AD-247).
export const BILLING_PLANS = ['trial', 'monthly', 'yearly', 'single_month'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

// Yearly = 12 monthly payments with 15% off.
export const BILLING_PLAN_CENTS: Record<BillingPlan, number> = {
  trial: 600,
  monthly: 6000,
  yearly: 61200,
  single_month: 6000,
};

// Days of access after the paid period of every plan, the trial included (AD-231).
export const BILLING_GRACE_DAYS = 5;

export const billingPaySchema = z.object({ plan: z.enum(BILLING_PLANS) }).strict();
export type BillingPay = z.infer<typeof billingPaySchema>;

// AD-251: PIX and boleto are paid on the Ethica screen; the card (credit or debit) on the Asaas invoice. The
// charge just created serves any of them: the web opens `url` for the card, its own screen for PIX and boleto.
export type BillingCharge = { paymentId: string; url: string };

export const billingPaymentQuerySchema = z.object({ method: z.enum(['pix', 'boleto']) }).strict();
export type BillingPaymentQuery = z.infer<typeof billingPaymentQuerySchema>;

// The PIX or boleto screen: only the part of the method asked for.
export type BillingPaymentView = {
  id: string;
  valueCents: number;
  dueDate: string;
  paid: boolean;
  pix?: { image: string; code: string; expiresAt: string };
  boleto?: { line: string; pdfUrl: string };
};

// `firstPayment`: the office never paid (new sign-up). `canPay`: only the admin pays.
export type BillingView = { firstPayment: boolean; trialAvailable: boolean; canPay: boolean; accessUntil?: string };
