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

    expect(screen.getAllByText('Entrar')).toHaveLength(2);
    expect(document.querySelector('a[href="/"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conta' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2); // Text size and submit; fixed light theme.
  });

  it('submits the form and redirects to the private area on a successful login (FND-10/AC2)', async () => {
    postMock.mockResolvedValue({ success: true, message: 'Login realizado com sucesso.' });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com');
    await user.type(screen.getByLabelText('Senha'), 'passwordCorreta123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/auth/signin', {
        email: 'admin@empresa.com',
        password: 'passwordCorreta123',
      });
    });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }));
  });

  it("renders the backend's ApiResponse message on login failure, never a raw error (FND-10/AC4)", async () => {
    postMock.mockResolvedValue({ success: false, message: 'E-mail ou senha inválidos.' });
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com');
    await user.type(screen.getByLabelText('Senha'), 'passwordErrada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
