import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((opts: { to: string }) => ({ isRedirect: true as const, ...opts }));
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, redirect: redirectMock };
});

const { t } = await import('../../lib/helpers/translate.helper.js');
const { beforeLoad } = await import('./route.js');

describe('_private beforeLoad guard (FND-10/AC3)', () => {
  afterEach(() => {
    redirectMock.mockClear();
  });

  it('does not redirect when ensureQueryData(sessionQuery) resolves (valid session)', async () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, 'ensureQueryData').mockResolvedValue({
      user: { id: '1', name: 'A', email: 'a@b.com' },
      role: ['admin'],
    } as never);

    await expect(beforeLoad({ context: { queryClient } })).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects to /auth exactly once when the session is invalid/expired, without looping', async () => {
    const queryClient = new QueryClient();
    const ensureSpy = vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValue(new Error('Sessão inválida.'));

    await expect(beforeLoad({ context: { queryClient } })).rejects.toEqual({ isRedirect: true, to: '/auth' });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith({ to: '/auth' });
    expect(ensureSpy).toHaveBeenCalledTimes(1);
  });

  it('redirects to /suspended, not /auth, when the tenant is suspended', async () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValue(new Error(t('tenant_suspended')));

    await expect(beforeLoad({ context: { queryClient } })).rejects.toEqual({ isRedirect: true, to: '/suspended' });
  });

  it('produces exactly one redirect per independent invalid-session navigation attempt — no accumulation across calls', async () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValue(new Error('Sessão inválida.'));

    await expect(beforeLoad({ context: { queryClient } })).rejects.toBeTruthy();
    await expect(beforeLoad({ context: { queryClient } })).rejects.toBeTruthy();

    expect(redirectMock).toHaveBeenCalledTimes(2);
  });

  // AD-137: guarda única dos módulos pela matriz — sem `ver`, volta ao início.
  it('redirects to / when the session cannot view the module of the URL', async () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, 'ensureQueryData').mockResolvedValue({
      user: { id: '1', name: 'A', email: 'a@b.com' },
      role: ['operator'],
      permissoes: { expert_cases: ['view'] },
    } as never);

    await expect(
      beforeLoad({ context: { queryClient }, location: { pathname: '/expert-cases/details' } }),
    ).resolves.toBeUndefined();
    await expect(beforeLoad({ context: { queryClient }, location: { pathname: '/finance/entries' } })).rejects.toEqual({
      isRedirect: true,
      to: '/',
    });
    await expect(
      beforeLoad({ context: { queryClient }, location: { pathname: '/expert-reports/templates' } }),
    ).rejects.toEqual({
      isRedirect: true,
      to: '/',
    });
    await expect(beforeLoad({ context: { queryClient }, location: { pathname: '/account' } })).resolves.toBeUndefined();
  });
});
