// Asaas API v3 (AD-230): the office subscription. Every charge is paid on the Asaas hosted invoice
// (`invoiceUrl`); the result arrives later by webhook, never by this response.
export type AsaasCharge = { id: string; invoiceUrl: string };

export type AsaasClient = {
  createCustomer: (data: {
    name: string;
    cpfCnpj: string;
    email: string;
    externalReference: string;
  }) => Promise<string>;
  // Single charge: the person picks boleto, PIX or card on the invoice.
  createPayment: (data: {
    customer: string;
    valueCents: number;
    dueDate: string;
    externalReference: string;
    successUrl: string;
  }) => Promise<AsaasCharge>;
  // Card subscription: the first invoice takes the card, Asaas charges the next ones on it.
  createSubscription: (data: {
    customer: string;
    valueCents: number;
    cycle: 'MONTHLY' | 'YEARLY';
    nextDueDate: string;
    successUrl: string;
  }) => Promise<AsaasCharge>;
  deleteSubscription: (id: string) => Promise<void>;
};

export class AsaasUnavailableError extends Error {
  constructor(readonly status?: number) {
    super(`Asaas indisponível${status ? ` (${status})` : ''}`);
    this.name = 'AsaasUnavailableError';
  }
}

// Asaas asks for at least 60 s on card operations.
const TIMEOUT_MS = 60_000;

export const createAsaasClient = (options: {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}): AsaasClient => {
  const fetchImpl = options.fetchImpl ?? fetch;

  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}${path}`, {
        method,
        headers: { access_token: options.apiKey, 'Content-Type': 'application/json', 'User-Agent': 'Ethica' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new AsaasUnavailableError();
    }
    if (!response.ok) {
      console.error(
        JSON.stringify({ event: 'asaas.request_failed', path, status: response.status, body: await response.text() }),
      );
      throw new AsaasUnavailableError(response.status);
    }
    return (await response.json()) as T;
  };

  const value = (cents: number) => cents / 100;

  return {
    createCustomer: async (data) =>
      (await call<{ id: string }>('POST', '/customers', { ...data, notificationDisabled: true })).id,
    createPayment: async (data) => {
      const payment = await call<AsaasCharge>('POST', '/payments', {
        customer: data.customer,
        billingType: 'UNDEFINED',
        value: value(data.valueCents),
        dueDate: data.dueDate,
        externalReference: data.externalReference,
        callback: { successUrl: data.successUrl },
      });
      return { id: payment.id, invoiceUrl: payment.invoiceUrl };
    },
    createSubscription: async (data) => {
      const subscription = await call<{ id: string }>('POST', '/subscriptions', {
        customer: data.customer,
        billingType: 'CREDIT_CARD',
        value: value(data.valueCents),
        cycle: data.cycle,
        nextDueDate: data.nextDueDate,
        description: 'Assinatura do Ethica',
        callback: { successUrl: data.successUrl },
      });
      const payments = await call<{ data: { invoiceUrl: string }[] }>(
        'GET',
        `/subscriptions/${subscription.id}/payments`,
      );
      const invoiceUrl = payments.data[0]?.invoiceUrl;
      if (!invoiceUrl) throw new AsaasUnavailableError();
      return { id: subscription.id, invoiceUrl };
    },
    deleteSubscription: async (id) => {
      await call('DELETE', `/subscriptions/${id}`);
    },
  };
};
