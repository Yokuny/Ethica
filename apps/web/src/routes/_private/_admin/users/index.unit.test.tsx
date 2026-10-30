// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client.api.js', () => api);
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLocation: () => ({ pathname: '/users' }),
  useMatches: () => [],
  useRouter: () => ({ history: { back: vi.fn() } }),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
const { UsersPage } = await import('./index.js');
const mount = (children: ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>,
  );
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe('UsersPage', () => {
  it('loads the directory and links to the invitation page', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'u1',
          name: 'Felipe Viana',
          email: 'felipe@empresa.com',
          role: ['admin'],
          active: true,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
      ],
    });
    mount(<UsersPage />);
    expect(await screen.findByText('Felipe Viana')).toBeVisible();
    expect(api.get).toHaveBeenCalledWith('/auth/users/directory');
    expect(screen.getByRole('link', { name: 'Convidar pessoa' })).toHaveAttribute('href', '/users/add');
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });
  it('shows the roles as the title above the card, initials, name and email (REG-08)', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'u1',
          name: 'Ana Maria Souza',
          email: 'ana@empresa.com',
          role: ['operator', 'admin'],
          active: false,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
      ],
    });
    mount(<UsersPage />);
    expect(await screen.findByText('Operador · Admin · Inativo')).toBeVisible();
    expect(screen.getByText('AS')).toBeVisible();
    expect(screen.getByText('Ana Maria Souza')).toBeVisible();
    expect(screen.getByText('ana@empresa.com')).toBeVisible();
    expect(screen.queryByTestId('featured-user')).not.toBeInTheDocument();
  });
  it('gives each manager a wide featured card above the rest of the team', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'u1',
          name: 'Luana Costa',
          email: 'luana@empresa.com',
          role: ['operator'],
          active: true,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
        {
          id: 'u2',
          name: 'Marcos Vieira',
          email: 'marcos@empresa.com',
          role: ['manager'],
          active: true,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
      ],
    });
    mount(<UsersPage />);
    const featured = await screen.findByTestId('featured-user');
    expect(featured).toHaveTextContent('Marcos Vieira');
    expect(featured).toHaveTextContent('Gestor');
    expect(featured).not.toHaveTextContent('Luana Costa');
    expect(screen.getByText('Luana Costa')).toBeVisible();
  });
  it('shows retry on load failure instead of empty directory', async () => {
    api.get.mockResolvedValue({ success: false, message: 'Falha real' });
    mount(<UsersPage />);
    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    expect(screen.queryByText('Envie um convite para adicionar uma pessoa à equipe.')).not.toBeInTheDocument();
  });
  it('distinguishes loading from an empty directory', async () => {
    let finish: (value: unknown) => void = () => {};
    api.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount(<UsersPage />);
    expect(screen.queryByText('Envie um convite para adicionar uma pessoa à equipe.')).not.toBeInTheDocument();
    finish({ success: true, data: [] });
    expect(await screen.findByText('Envie um convite para adicionar uma pessoa à equipe.')).toBeVisible();
  });
});
