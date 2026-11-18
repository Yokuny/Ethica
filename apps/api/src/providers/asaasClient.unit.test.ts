import { describe, expect, it, vi } from 'vitest';
import { AsaasUnavailableError, createAsaasClient } from './asaasClient.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('createAsaasClient', () => {
  it('cobrança avulsa vai em reais, com a forma de pagamento à escolha e a chave no header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ id: 'pay_1', invoiceUrl: 'https://asaas/i/1' }));
    const client = createAsaasClient({ baseUrl: 'https://asaas/v3', apiKey: 'key', fetchImpl });

    const charge = await client.createPayment({
      customer: 'cus_1',
      valueCents: 6000,
      dueDate: '2026-11-18',
      externalReference: 'single_month',
      successUrl: 'https://app',
    });

    expect(charge).toEqual({ id: 'pay_1', invoiceUrl: 'https://asaas/i/1' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://asaas/v3/payments');
    expect((init.headers as Record<string, string>).access_token).toBe('key');
    expect(JSON.parse(init.body as string)).toMatchObject({ billingType: 'UNDEFINED', value: 60 });
  });

  it('assinatura no cartão devolve o id; a fatura vem da primeira cobrança dela', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ id: 'sub_1' }))
      .mockResolvedValueOnce(json({ data: [{ invoiceUrl: 'https://asaas/i/2' }] }));
    const client = createAsaasClient({ baseUrl: 'https://asaas/v3', apiKey: 'key', fetchImpl });

    const id = await client.createSubscription({
      customer: 'cus_1',
      valueCents: 61200,
      cycle: 'YEARLY',
      nextDueDate: '2026-11-18',
      successUrl: 'https://app',
    });

    expect(id).toBe('sub_1');
    expect(JSON.parse((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body as string)).toMatchObject({
      billingType: 'CREDIT_CARD',
      value: 612,
      cycle: 'YEARLY',
    });
    expect(await client.firstInvoiceUrl('sub_1')).toBe('https://asaas/i/2');
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('https://asaas/v3/subscriptions/sub_1/payments');
  });

  it('apagar assinatura que já não existe (404) não é erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = createAsaasClient({
      baseUrl: 'https://asaas/v3',
      apiKey: 'key',
      fetchImpl: vi.fn().mockResolvedValue(json({ errors: [] }, 404)),
    });
    await expect(client.deleteSubscription('sub_1')).resolves.toBeUndefined();
  });

  it('resposta de erro ou falha de rede vira AsaasUnavailableError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const refused = createAsaasClient({
      baseUrl: 'https://asaas/v3',
      apiKey: 'key',
      fetchImpl: vi.fn().mockResolvedValue(json({ errors: [] }, 400)),
    });
    await expect(refused.deleteSubscription('sub_1')).rejects.toBeInstanceOf(AsaasUnavailableError);

    const offline = createAsaasClient({
      baseUrl: 'https://asaas/v3',
      apiKey: 'key',
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
    });
    await expect(
      offline.createCustomer({ name: 'a', cpfCnpj: '1', email: 'a@b.c', externalReference: 't' }),
    ).rejects.toBeInstanceOf(AsaasUnavailableError);
  });
});
