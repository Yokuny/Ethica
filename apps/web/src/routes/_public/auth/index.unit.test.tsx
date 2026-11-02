// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();
vi.mock('@/lib/api/client.api.js', () => ({ post: postMock }));

const navigateMock = vi.fn();
// useLocation/useMatches/useRouter: dependencies of the public frame — without
// <RouterProvider> in these isolated page tests, the real
// TanStack Router hooks throw. Minimal mocks only so the render does not break; the
// Card breadcrumb/back-button behavior is not in the scope of these tests.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: '/auth' }),
    useSearch: () => ({}),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
  };
});

const { AuthPage } = await import('./index.js');

describe('AuthPage', () => {
  afterEach(() => {
    cleanup();
    postMock.mockReset();
    navigateMock.mockReset();
  });

  it('renders the public page frame without a private home link, account menu, or back action', () => {
    render(<AuthPage />);

    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(document.querySelector('a[href="/"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conta' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2); // Text size and submit; fixed light theme.
  });

  it('sends the key to the e-mail, then signs in with the 6-digit code (ACE-01/03)', async () => {
    postMock.mockResolvedValueOnce({ success: true, message: 'Enviamos a chave de acesso para o seu e-mail.' });
    postMock.mockResolvedValueOnce({ success: true, data: { signedIn: true } });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('E-mail'), 'Admin@Empresa.com');
    await user.click(screen.getByRole('button', { name: 'Enviar chave de acesso' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/auth/access-key', { email: 'admin@empresa.com' }));

    await user.type(await screen.findByLabelText('Código de acesso'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/access-key/verify', { email: 'admin@empresa.com', code: '123456' }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }));
  });

  it('asks for the office when the confirmed e-mail has no account, then creates it (ACE-04)', async () => {
    postMock.mockResolvedValueOnce({ success: true });
    postMock.mockResolvedValueOnce({ success: true, data: { signupToken: 'ticket' } });
    postMock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('E-mail'), 'nova@perita.com');
    await user.click(screen.getByRole('button', { name: 'Enviar chave de acesso' }));
    await user.type(await screen.findByLabelText('Código de acesso'), '654321');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await user.type(await screen.findByLabelText('Seu nome'), 'Nova Perita');
    await user.type(screen.getByLabelText('Nome do escritório'), 'Perícias Nova');
    await user.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81');
    await user.click(screen.getByRole('button', { name: 'Criar escritório' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/signup', {
        signupToken: 'ticket',
        name: 'Nova Perita',
        officeName: 'Perícias Nova',
        document: '11222333000181',
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }));
  });

  it("shows the backend's message on a wrong code and stays on the code step", async () => {
    postMock.mockResolvedValueOnce({ success: true });
    postMock.mockResolvedValueOnce({ success: false, message: 'Chave de acesso inválida ou vencida. Peça uma nova.' });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com');
    await user.click(screen.getByRole('button', { name: 'Enviar chave de acesso' }));
    await user.type(await screen.findByLabelText('Código de acesso'), '000000');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Chave de acesso inválida ou vencida. Peça uma nova.')).toBeInTheDocument();
    expect(screen.getByLabelText('Código de acesso')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
