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

  it('new office: trial, monthly and yearly, the single month inside the monthly; paying opens the Asaas invoice (CHK-04, CHK-07, AD-250)', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: true, trialAvailable: true, canPay: true } });
    postMock.mockResolvedValue({ success: true, data: { url: 'https://asaas/i/1' } });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Escolha seu plano')).toBeInTheDocument();
    // The comparison columns, one per card.
    expect(
      screen.getAllByRole('button', { name: /^Pagar / }).map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Pagar Teste', 'Pagar Mensal', 'Pagar Anual']);

    // Price per month on every card: the trial is the first month (AD-247), the yearly against the monthly.
    expect(screen.getByText(/Economize R\$\s108,00/)).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s60,00$/, { selector: '.line-through' })).toBeInTheDocument();
    expect(screen.getByText('90% de desconto')).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s612,00 cobrados uma vez por ano/)).toHaveLength(2);
    expect(screen.getByText(/R\$\s51,00 por mês em vez de R\$\s60,00/)).toBeInTheDocument();
    // Monthly: everything of the trial plus the team.
    expect(screen.getByText('Tudo do Teste, e mais:')).toBeInTheDocument();
    expect(screen.getByText(/Convide quantas pessoas quiser/)).toBeInTheDocument();
    expect(screen.getByText('O teste renova sozinho?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Assinar o Anual' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/billing/pay', { plan: 'yearly' }));
    expect(assign).toHaveBeenCalledWith('https://asaas/i/1');
  });

  it('the single month by boleto or PIX is paid from the monthly card (AD-250)', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: true, trialAvailable: true, canPay: true } });
    postMock.mockResolvedValue({ success: true, data: { url: 'https://asaas/i/2' } });
    Object.defineProperty(window, 'location', { value: { assign: vi.fn() }, configurable: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Prefere boleto ou PIX? Pague um mês avulso' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/billing/pay', { plan: 'single_month' }));
  });

  it('paid before: no trial; a member who is not admin only reads the notice', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: false, trialAvailable: false, canPay: false } });
    renderPage();

    expect(
      await screen.findByText('O acesso volta quando o administrador do escritório pagar a mensalidade.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pagar/ })).not.toBeInTheDocument();
    // Prices still show to the member: the monthly in its card and in the comparison price row.
    expect(screen.getAllByText(/^R\$\s60,00$/)).toHaveLength(2);
    // Without the trial card, the monthly lists the trial features itself.
    expect(screen.queryByText(/Tudo do Teste/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Vistoria em campo/).length).toBeGreaterThan(0);
    expect(screen.queryByText('O teste renova sozinho?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
});
