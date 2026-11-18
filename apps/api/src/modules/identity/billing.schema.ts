import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { AsaasClient } from '../../providers/asaasClient.js';

export type { BillingPay, BillingPlan, BillingView } from '@ethica/contracts';
export { billingPaySchema } from '@ethica/contracts';

// `asaas` absent = Asaas not configured (no key): paying answers `billing_not_configured`.
// `returnUrl` absent = the invoice does not send the person back (domain not registered in Asaas).
export type BillingRouterDeps = {
  validSession: RequestHandler;
  asaas?: AsaasClient;
  returnUrl?: string;
  webhookToken?: string;
};

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// AD-230: only the fields the reconciliation reads. Not strict: Asaas adds attributes to the
// webhook and a rejection would stop its delivery queue.
export const asaasWebhookSchema = z.object({
  event: z.string(),
  payment: z
    .object({
      id: z.string(),
      customer: z.string(),
      subscription: z.string().nullish(),
      externalReference: z.string().nullish(),
      dueDate: calendarDate,
      confirmedDate: calendarDate.nullish(),
      paymentDate: calendarDate.nullish(),
    })
    .optional(),
});

export type AsaasWebhook = z.infer<typeof asaasWebhookSchema>;

export type BillingTenant = {
  id: string;
  name: string;
  document: string;
  accessUntil?: Date;
  billing?: {
    customerId?: string;
    subscriptionId?: string;
    subscriptionPlan?: 'monthly' | 'yearly';
    trialPaymentId?: string;
    trialInvoiceUrl?: string;
    paidAt?: Date;
  };
};
