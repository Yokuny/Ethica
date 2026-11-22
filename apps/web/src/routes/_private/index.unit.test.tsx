// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { caseDistributionQuery } from '../../query/case.js';
import { sessionQuery } from '../../query/session.js';

// useLocation/useMatches/useRouter: dependencies of Card asPage — without
// <RouterProvider> in this isolated page test, the real TanStack
// Router hooks throw. Link becomes a plain <a> to check the destinations.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, search, children }: { to: string; search?: object; children?: ReactNode }) => (
      <a href={search ? `${to}?${JSON.stringify(search)}` : to}>{children}</a>
    ),
  };
});

const { PrivateIndexPage } = await import('./index.js');

const renderHome = (role: Role[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active' },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role,
    permissions: effectivePermissions(role),
  });
  queryClient.setQueryData(['preferences'], {
    onboardingDismissed: false,
    deadlineReminderEmail: true,
    hiddenBlocks: [],
  });
  queryClient.setQueryData(['list-stats', '/expert-cases/stats'], {
    total: 12,
    groups: [
      { key: 'open', count: 7 },
      { key: 'overdue_deadlines', count: 2 },
      { key: 'deadlines_due_soon', count: 3 },
    ],
  });
  queryClient.setQueryData(caseDistributionQuery.queryKey, {
    phase: [],
    courtType: [
      { key: 'civil', count: 23 },
      { key: 'federal', count: 8 },
      { key: 'labor', count: 23 },
      { key: 'none', count: 26 },
    ],
  } as never);
  queryClient.setQueryData(['transaction', 'summary'], {
    receivableCents: 1_250_000,
    lateCents: 0,
    receivedMonthCents: 0,
    expensesMonthCents: 0,
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PrivateIndexPage />
    </QueryClientProvider>,
  );
};

describe('PrivateIndexPage', () => {
  afterEach(() => cleanup());

  it('mostra os indicadores de perícias', () => {
    renderHome(['admin']);

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('valores financeiros só aparecem para admin/manager', () => {
    renderHome(['operator']);

    expect(screen.queryByText('A receber')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Financeiro/ })).not.toBeInTheDocument();
    cleanup();

    renderHome(['manager']);
    expect(screen.getByText('A receber')).toBeInTheDocument();
  });

  it('serviços por justiça: o todo inclui os sem justiça e cada justiça abre a lista filtrada (AD-253)', () => {
    renderHome(['operator']);

    expect(screen.getByText('54 de 80 serviços têm justiça')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cível\s*23\s*29%/ })).toHaveAttribute(
      'href',
      '/expert-cases?{"courtType":["civil"]}',
    );
    expect(screen.getByText('Sem justiça').closest('a')).toBeNull();
  });
});
