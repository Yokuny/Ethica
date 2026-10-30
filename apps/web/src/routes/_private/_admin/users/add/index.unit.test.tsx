// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client.api.js', () => api);
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useLocation: () => ({ pathname: '/users/add' }),
  useMatches: () => [],
  useRouter: () => ({ history: { back: vi.fn() } }),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
const { UserInvitePage } = await import('./index.js');
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
describe('UserInvitePage', () => {
  it('sends normalized email and selected role; resets only after successful mail', async () => {
    api.post.mockResolvedValue({ success: true, data: { id: 'invite' } });
    const user = userEvent.setup();
    mount(<UserInvitePage />);
    await user.type(screen.getByLabelText('E-mail'), 'NEW@example.com');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Gestor' }));
    await user.click(screen.getAllByRole('button', { name: 'Enviar convite' })[0] as HTMLElement);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/tenant/invites', { email: 'new@example.com', role: 'manager' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Convite enviado.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByRole('combobox')).toHaveTextContent('Operador');
  });
  it.each([
    { success: false, message: 'Este e-mail já pertence a um usuário.', data: undefined, role: 'alert' },
    { success: true, message: 'Convite criado, mas o envio do e-mail falhou.', data: { id: 'invite' }, role: 'status' },
  ])('preserves fields on response $message', async (response) => {
    api.post.mockResolvedValue(response);
    const user = userEvent.setup();
    mount(<UserInvitePage />);
    await user.type(screen.getByLabelText('E-mail'), 'retry@example.com');
    await user.click(screen.getAllByRole('button', { name: 'Enviar convite' })[0] as HTMLElement);
    expect(await screen.findByRole(response.role)).toHaveTextContent(response.message);
    expect(screen.getByLabelText('E-mail')).toHaveValue('retry@example.com');
    expect(screen.getByRole('combobox')).toHaveTextContent('Operador');
  });
  it('rejects invalid email before mutation and disables submit while pending', async () => {
    let finish: (value: unknown) => void = () => {};
    api.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    mount(<UserInvitePage />);
    await user.type(screen.getByLabelText('E-mail'), 'invalid');
    await user.click(screen.getAllByRole('button', { name: 'Enviar convite' })[0] as HTMLElement);
    expect(api.post).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('E-mail'));
    await user.type(screen.getByLabelText('E-mail'), 'valid@example.com');
    await user.click(screen.getAllByRole('button', { name: 'Enviar convite' })[0] as HTMLElement);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Enviar convite' })[0] as HTMLElement).toBeDisabled(),
    );
    finish({ success: true, data: { id: 'done' } });
    await screen.findByRole('status');
  });
});
