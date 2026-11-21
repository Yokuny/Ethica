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

  it('new office: trial, monthly, yearly and single month; paying opens the Asaas invoice (CHK-04, CHK-07)', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: true, trialAvailable: true, canPay: true } });
    postMock.mockResolvedValue({ success: true, data: { url: 'https://asaas/i/1' } });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Escolha seu plano')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /^Pagar / }).map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Pagar Teste', 'Pagar Mensal', 'Pagar Anual', 'Pagar Mensalidade avulsa']);

    // Sales offer: the trial is the first month (AD-247), yearly against 12 months.
    expect(screen.getByText(/Economize R\$\s54,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s720,00/)).toHaveClass('line-through');
    expect(screen.getByText(/Equivale a R\$\s51,00 por mês/)).toBeInTheDocument();
    // Monthly: everything of the trial plus the team.
    expect(screen.getByText('Tudo do Teste, e mais')).toBeInTheDocument();
    expect(screen.getByText(/Convide quantas pessoas quiser/)).toBeInTheDocument();
    expect(screen.getByText('O teste renova sozinho?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pagar Anual' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/billing/pay', { plan: 'yearly' }));
    expect(assign).toHaveBeenCalledWith('https://asaas/i/1');
  });

  it('paid before: no trial; a member who is not admin only reads the notice', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: false, trialAvailable: false, canPay: false } });
    renderPage();

    expect(
      await screen.findByText('O acesso volta quando o administrador do escritório pagar a mensalidade.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pagar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assinar o Mensal' })).not.toBeInTheDocument();
    // Prices still show to the member: monthly and single month, in the cards and in the comparison.
    expect(screen.getAllByText(/60,00/)).toHaveLength(4);
    // Without the trial card, the monthly lists the trial features itself.
    expect(screen.queryByText(/Tudo do Teste/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Vistoria em campo/).length).toBeGreaterThan(0);
    expect(screen.queryByText('O teste renova sozinho?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
});
