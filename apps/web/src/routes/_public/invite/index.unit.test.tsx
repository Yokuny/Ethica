// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('@/lib/api/client.api.js', () => ({ get: getMock, post: postMock }));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startRegistration: async () => ({ id: 'cred', rawId: 'cred', type: 'public-key', response: {} }),
}));

const navigateMock = vi.fn();
const searchMock = vi.fn();
// useLocation/useMatches/useRouter: dependencies of the public frame — without
// <RouterProvider> in these isolated page tests, the real
// TanStack Router hooks throw. Minimal mocks only so the render does not break; the
// Card breadcrumb/back-button behavior is not in the scope of these tests.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
    useLocation: () => ({ pathname: '/' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
  };
});

const { inviteSearchSchema } = await import('./@interface/invite.interface.js');
const { InvitePage } = await import('./index.js');

const renderInvitePage = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <InvitePage />
    </QueryClientProvider>,
  );
};

describe('InvitePage', () => {
  afterEach(() => {
    cleanup();
    getMock.mockReset();
    postMock.mockReset();
    navigateMock.mockReset();
    searchMock.mockReset();
  });

  it('shows a fallback message without crashing when the token search param is missing (FND-10/AC1)', () => {
    searchMock.mockReturnValue({});

    renderInvitePage();

    expect(screen.getByText('Link inválido.')).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('treats a non-string token as missing instead of failing search validation', () => {
    expect(inviteSearchSchema.parse({ token: ['bad-token'] })).toEqual({ token: undefined });
  });

  it('renders the 410 message from the ApiResponse for an invalid/expired token, without breaking the screen', async () => {
    searchMock.mockReturnValue({ token: 'expired-token' });
    getMock.mockResolvedValue({ success: false, message: 'Este convite expirou.' });

    renderInvitePage();

    expect(await screen.findByText('Este convite expirou.')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/invites/expired-token');
  });

  it('offers manual retry after a failed invitation lookup and renders the form after recovery', async () => {
    searchMock.mockReturnValue({ token: 'valid-token' });
    getMock
      .mockResolvedValueOnce({ success: false, message: 'Indisponível.' })
      .mockResolvedValueOnce({ success: true, data: { tenantName: 'Empresa X', email: 'convite@empresa.com' } });
    const user = userEvent.setup();

    renderInvitePage();
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText(/Empresa X/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('shows the tenant name and email from GET /invites/:token before rendering the form, for a valid token (FND-10/AC1)', async () => {
    searchMock.mockReturnValue({ token: 'valid-token' });
    getMock.mockResolvedValue({
      success: true,
      data: { tenantName: 'Empresa X', email: 'convidado@empresa.com' },
      message: '',
    });

    renderInvitePage();

    expect(await screen.findByText(/Empresa X/)).toBeInTheDocument();
    expect(screen.getByText('convidado@empresa.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('after accepting, creates the passkey of this device and only then enters (APA-04)', async () => {
    searchMock.mockReturnValue({ token: 'valid-token' });
    getMock.mockResolvedValue({ success: true, data: { tenantName: 'Empresa X', email: 'convidado@empresa.com' } });
    postMock
      .mockResolvedValueOnce({ success: true, data: { passkeyToken: 'passkey-ticket' } })
      .mockResolvedValueOnce({ success: true, data: { options: { challenge: 'c' }, challengeToken: 'challenge' } })
      .mockResolvedValueOnce({ success: true, data: { signedIn: true } });
    const user = userEvent.setup();

    renderInvitePage();
    await user.type(await screen.findByLabelText('Nome'), 'Fulano Novo');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(navigateMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Ativar neste aparelho' }));
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/passkey/register/options', { passkeyToken: 'passkey-ticket' }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }));
  });
});
