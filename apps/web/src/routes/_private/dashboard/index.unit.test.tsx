// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionQuery } from '@/query/session.js';
import { caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/dashboard' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
  };
});

const { DashboardPage } = await import('./index.js');

const renderPage = (role: Role[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active' },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role,
    permissions: effectivePermissions(role),
  } as never);
  queryClient.setQueryData(caseDashboardQuery.queryKey, {
    total: 12,
    closed: 5,
    byType: [
      { role: 'court_expert', count: 9 },
      { role: 'other', serviceType: 'Parceria', count: 3 },
    ],
    courtExpertByYear: [{ year: '2026', count: 9 }],
  });
  queryClient.setQueryData(feesDashboardQuery.queryKey, {
    receivableCents: 50_000,
    receivedByYear: [
      { year: '2025', cents: 100_000 },
      { year: '2026', cents: 200_000 },
    ],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
};

describe('Dashboard (DSH)', () => {
  afterEach(cleanup);

  it('mostra os totais, os tipos e o recebido somado', () => {
    renderPage(['admin']);
    expect(screen.getByText('Serviços finalizados')).toBeInTheDocument();
    expect(screen.getByText('Perícia')).toBeInTheDocument();
    expect(screen.getByText('Parceria')).toBeInTheDocument();
    expect(screen.getByText(/3\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('Honorários recebidos por ano')).toBeInTheDocument();
  });

  it('sem o Financeiro, nenhum valor em dinheiro aparece (DSH-06)', () => {
    renderPage(['operator']);
    expect(screen.getByText('Perícias por ano')).toBeInTheDocument();
    expect(screen.queryByText('Honorários recebidos')).not.toBeInTheDocument();
    expect(screen.queryByText('Honorários recebidos por ano')).not.toBeInTheDocument();
  });
});
