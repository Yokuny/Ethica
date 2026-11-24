// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackedCasesQuery } from '../../../query/automation.js';
import { notificationsQuery } from '../../../query/notification.js';
import { sessionQuery } from '../../../query/session.js';

// Card asPage needs the router hooks; Link becomes a plain <a> to check the destinations.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/automation' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, search, children }: { to: string; search?: object; children?: ReactNode }) => (
      <a href={search ? `${to}?${JSON.stringify(search)}` : to}>{children}</a>
    ),
  };
});

const { AutomationPage } = await import('./index.js');

const renderPage = (automationUntil?: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active', automationUntil },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role: ['admin'],
    permissions: effectivePermissions(['admin']),
  });
  queryClient.setQueryData(notificationsQuery({ kind: ['suggestion'], limit: 1 }).queryKey, {
    items: [{ id: 's1' }],
    total: 2,
  } as never);
  queryClient.setQueryData(trackedCasesQuery.queryKey, [
    { caseId: 'c1', caseLabel: '0024364-65.2020.5.24.0091', court: 'TRT24', syncedAt: '2026-11-20T06:00:00.000Z' },
  ]);
  render(
    <QueryClientProvider client={queryClient}>
      <AutomationPage />
    </QueryClientProvider>,
  );
};

describe('AutomationPage', () => {
  afterEach(cleanup);

  it('sem o módulo mostra a oferta', () => {
    renderPage();
    expect(screen.getByText('Ver planos')).toBeInTheDocument();
    expect(screen.queryByText('Processos acompanhados')).not.toBeInTheDocument();
  });

  it('com o módulo mostra as sugestões e os processos acompanhados, com as regras no menu', () => {
    renderPage(new Date(Date.now() + 86_400_000).toISOString());
    expect(screen.getByText('sugestões esperando a sua aprovação').closest('a')).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(screen.getByText('0024364-65.2020.5.24.0091').closest('a')).toHaveAttribute(
      'href',
      '/expert-cases/details?{"id":"c1"}',
    );
    expect(screen.queryByText('Processo suspenso ou sobrestado')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument();
  });
});
