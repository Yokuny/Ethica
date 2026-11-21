// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const navigateMock = vi.fn();
vi.mock('@/lib/api/client.api.js', () => ({ get: getMock, post: vi.fn() }));

let search = { method: 'pix' };
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    Link: ({ children }: { children?: unknown }) => <a href="/">{children as string}</a>,
    createFileRoute: () => (options: object) => ({
      ...options,
      useParams: () => ({ paymentId: 'pay_1' }),
      useSearch: () => search,
    }),
  };
});

const { BillingPaymentPage } = await import('./index.js');

const closed = { success: true, data: { firstPayment: true, trialAvailable: true, canPay: true } };
const charge = (extra: object) => ({
  success: true,
  data: { id: 'pay_1', valueCents: 600, dueDate: '2026-11-24', paid: false, ...extra },
});
const serve = (payment: object, billing: object = closed) =>
  getMock.mockImplementation(async (url: string) => (url.startsWith('/billing/payments/') ? payment : billing));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BillingPaymentPage />
    </QueryClientProvider>,
  );

describe('BillingPaymentPage (CHK-12, AD-251)', () => {
  afterEach(() => {
    cleanup();
    getMock.mockReset();
    navigateMock.mockReset();
  });

  it('PIX: QR Code and copy-paste code of the charge, waiting for the payment', async () => {
    search = { method: 'pix' };
    serve(charge({ pix: { image: 'aW1n', code: '000201pix', expiresAt: '2026-11-22 23:59:59' } }));
    renderPage();

    expect(await screen.findByText('000201pix')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code do PIX')).toHaveAttribute('src', 'data:image/png;base64,aW1n');
    expect(screen.getByText(/R\$\s6,00/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/billing/payments/pay_1?method=pix');
    expect(screen.getByText(/Aguardando o pagamento/)).toBeInTheDocument();
  });

  it('boleto: line, PDF and due date', async () => {
    search = { method: 'boleto' };
    serve(charge({ boleto: { line: '4619111', pdfUrl: 'https://asaas/b/1' } }));
    renderPage();

    expect(await screen.findByText('4619111')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir boleto em PDF' })).toHaveAttribute('href', 'https://asaas/b/1');
    expect(screen.getByText(/Vencimento/)).toBeInTheDocument();
  });

  it('payment confirmed: the office opens and the screen enters the app', async () => {
    search = { method: 'pix' };
    serve(charge({ paid: true }), { success: true, data: { ...closed.data, accessUntil: '2999-01-01T03:00:00.000Z' } });
    renderPage();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }));
  });

  it('error from the API (no Pix key): message and the way back', async () => {
    search = { method: 'pix' };
    serve({ success: false, message: 'O PIX está indisponível no momento. Escolha outra forma de pagamento.' });
    renderPage();
    expect(await screen.findByText(/O PIX está indisponível/)).toBeInTheDocument();
    expect(screen.getAllByText('Voltar aos planos').length).toBeGreaterThan(0);
  });
});
