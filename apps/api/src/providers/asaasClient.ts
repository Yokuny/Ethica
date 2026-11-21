// Asaas API v3 (AD-230): the office subscription. Every charge is paid on the Asaas hosted invoice
// (`invoiceUrl`); the result arrives later by webhook, never by this response.
export type AsaasCharge = { id: string; invoiceUrl: string };

// A charge as Asaas returns it; the billing module validates the fields it reads (`asaasPaymentSchema`).
export type AsaasPayment = Record<string, unknown> & { id: string; customer: string };

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
    successUrl?: string;
  }) => Promise<AsaasCharge>;
  // Card subscription: the first invoice takes the card, Asaas charges the next ones on it. Returns
  // the id alone, so the caller saves it before asking for the invoice.
  createSubscription: (data: {
    customer: string;
    valueCents: number;
    cycle: 'MONTHLY' | 'YEARLY';
    nextDueDate: string;
    successUrl?: string;
  }) => Promise<string>;
  // The first charge of the subscription, with the invoice the card is taken on.
  firstPayment: (subscriptionId: string) => Promise<AsaasCharge>;
  getPayment: (id: string) => Promise<AsaasPayment>;
  // The latest charges of the customer; a short wait, since the plans screen asks for them (AD-251).
  listPayments: (customer: string) => Promise<AsaasPayment[]>;
  pixQrCode: (id: string) => Promise<{ encodedImage: string; payload: string; expirationDate: string }>;
  boletoLine: (id: string) => Promise<{ identificationField: string }>;
  // A subscription already gone (404) counts as deleted.
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
const CHECK_TIMEOUT_MS = 10_000;

export const createAsaasClient = (options: {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}): AsaasClient => {
  const fetchImpl = options.fetchImpl ?? fetch;

  const call = async <T>(method: string, path: string, body?: unknown, timeoutMs = TIMEOUT_MS): Promise<T> => {
    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}${path}`, {
        method,
        headers: { access_token: options.apiKey, 'Content-Type': 'application/json', 'User-Agent': 'Ethica' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
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
        ...(data.successUrl ? { callback: { successUrl: data.successUrl } } : {}),
      });
      return { id: payment.id, invoiceUrl: payment.invoiceUrl };
    },
    createSubscription: async (data) =>
      (
        await call<{ id: string }>('POST', '/subscriptions', {
          customer: data.customer,
          billingType: 'CREDIT_CARD',
          value: value(data.valueCents),
          cycle: data.cycle,
          nextDueDate: data.nextDueDate,
          description: 'Assinatura do Ethica',
          ...(data.successUrl ? { callback: { successUrl: data.successUrl } } : {}),
        })
      ).id,
    firstPayment: async (subscriptionId) => {
      const payments = await call<{ data: AsaasCharge[] }>('GET', `/subscriptions/${subscriptionId}/payments`);
      const first = payments.data[0];
      if (!first?.invoiceUrl) throw new AsaasUnavailableError();
      return { id: first.id, invoiceUrl: first.invoiceUrl };
    },
    getPayment: (id) => call<AsaasPayment>('GET', `/payments/${id}`),
    listPayments: async (customer) =>
      (
        await call<{ data: AsaasPayment[] }>(
          'GET',
          `/payments?customer=${customer}&limit=10`,
          undefined,
          CHECK_TIMEOUT_MS,
        )
      ).data,
    pixQrCode: (id) => call('GET', `/payments/${id}/pixQrCode`),
    boletoLine: (id) => call('GET', `/payments/${id}/identificationField`),
    deleteSubscription: async (id) => {
      try {
        await call('DELETE', `/subscriptions/${id}`);
      } catch (e) {
        if (!(e instanceof AsaasUnavailableError && e.status === 404)) throw e;
      }
    },
  };
};
