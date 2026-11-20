// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const navigateMock = vi.fn();
const postMock = vi.fn();
vi.mock('@/lib/api/client.api.js', () => ({ get: getMock, post: postMock }));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: '/billing' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    // The breadcrumb link of the header needs a real router; out of scope here.
    Link: ({ children }: { children?: unknown }) => <a href="/">{children as string}</a>,
  };
});

// Embla (carousel) reads these browser APIs that jsdom lacks.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', NoopObserver);
vi.stubGlobal('IntersectionObserver', NoopObserver);
vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
}));

const { BillingPage } = await import('./index.js');

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BillingPage />
    </QueryClientProvider>,
  );

describe('BillingPage (AD-230)', () => {
  afterEach(() => {
    cleanup();
    getMock.mockReset();
    postMock.mockReset();
    navigateMock.mockReset();
  });

  it('payment confirmed while on the page: enters the app (CHK-05)', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: { firstPayment: false, trialAvailable: false, canPay: true, accessUntil: '2999-01-01T03:00:00.000Z' },
    });
    renderPage();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }));
  });

  it('new office: trial, subscription and single month; paying opens the Asaas invoice (CHK-04, CHK-07)', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: true, trialAvailable: true, canPay: true } });
    postMock.mockResolvedValue({ success: true, data: { url: 'https://asaas/i/1' } });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Escolha seu plano')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Pagar / })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Pagar Teste' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagar Mensalidade avulsa' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pagar Mensal' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/billing/pay', { plan: 'monthly' }));
    expect(assign).toHaveBeenCalledWith('https://asaas/i/1');
  });

  it('the toggle turns the subscription into the yearly plan', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: false, trialAvailable: false, canPay: true } });
    postMock.mockResolvedValue({ success: true, data: { url: 'https://asaas/i/2' } });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Anual' }));
    expect(screen.queryByRole('button', { name: 'Pagar Teste' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pagar Anual' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/billing/pay', { plan: 'yearly' }));
  });

  it('paid before: no trial; a member who is not admin only reads the notice', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: false, trialAvailable: false, canPay: false } });
    renderPage();

    expect(
      await screen.findByText('O acesso volta quando o administrador do escritório pagar a mensalidade.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pagar/ })).not.toBeInTheDocument();
    // Prices still show to the member: monthly and single month.
    expect(screen.getAllByText(/60,00/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
});
