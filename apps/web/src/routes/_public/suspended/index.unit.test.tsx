// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('@/lib/api/client.api.js', () => ({ get: getMock, post: postMock }));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/suspended' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    // The breadcrumb link of the header needs a real router; out of scope here.
    Link: ({ children }: { children?: unknown }) => <a href="/">{children as string}</a>,
  };
});

const { SuspendedPage } = await import('./index.js');

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SuspendedPage />
    </QueryClientProvider>,
  );

describe('SuspendedPage (AD-230)', () => {
  afterEach(() => {
    cleanup();
    getMock.mockReset();
    postMock.mockReset();
  });

  it('new office: shows the four plans and paying opens the Asaas invoice (CHK-04, CHK-07)', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: true, trialAvailable: true, canPay: true } });
    postMock.mockResolvedValue({ success: true, data: { url: 'https://asaas/i/1' } });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Escolha seu plano')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Pagar' })).toHaveLength(4);

    await user.click(screen.getAllByRole('button', { name: 'Pagar' })[1] as HTMLElement);
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/billing/pay', { plan: 'monthly' }));
    expect(assign).toHaveBeenCalledWith('https://asaas/i/1');
  });

  it('paid before: no trial; a member who is not admin only reads the notice', async () => {
    getMock.mockResolvedValue({ success: true, data: { firstPayment: false, trialAvailable: false, canPay: false } });
    renderPage();

    expect(
      await screen.findByText('O acesso volta quando o administrador do escritório pagar a mensalidade.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pagar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
});
