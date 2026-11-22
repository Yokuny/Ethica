// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionQuery } from '@/query/session.js';
import { categoriesQuery } from '@/query/transaction.js';
import { caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/dashboard' }),
    useMatches: () => [],
    useSearch: () => ({ months: '6' }),
    useNavigate: () => vi.fn(),
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, search, children }: { to: string; search?: object; children?: ReactNode }) => (
      <a href={search ? `${to}?${JSON.stringify(search)}` : to}>{children}</a>
    ),
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
    byMonth: [
      { month: '2026-10', count: 4, byType: [{ role: 'court_expert', count: 4 }] },
      {
        month: '2026-11',
        count: 5,
        byType: [
          { role: 'court_expert', count: 3 },
          { role: 'other', serviceType: 'Parceria', count: 2 },
        ],
      },
    ],
  });
  queryClient.setQueryData(categoriesQuery('income', 6).queryKey, [
    { category: 'fixed_fees', totalCents: 400_000, previousCents: 200_000 },
    { category: 'contracted_fees', totalCents: 100_000, previousCents: 0 },
  ]);
  queryClient.setQueryData(categoriesQuery('expense', 6).queryKey, [
    { category: 'travel', totalCents: 50_000, previousCents: 100_000 },
  ]);
  queryClient.setQueryData(feesDashboardQuery.queryKey, {
    receivableCents: 50_000,
    receivedCents: 300_000,
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
    // In the ranking by type and as a column of the table by month.
    expect(screen.getAllByText('Perícia')).toHaveLength(2);
    expect(screen.getAllByText('Parceria')).toHaveLength(2);
    expect(screen.getByText(/3\.000,00/)).toBeInTheDocument();
  });

  it('serviços por mês: total e cada tipo com a variação contra o mês anterior', () => {
    renderPage(['operator']);
    const november = screen.getByRole('rowheader', { name: /novembro de 2026/i }).closest('tr') as HTMLElement;
    expect(november).toHaveTextContent('Em andamento');
    // Total 5 (+1), Perícia 3 (-1), Parceria 2 (+2).
    expect(november).toHaveTextContent(/5\s*\+1.*3\s*-1.*2\s*\+2/);
  });

  it('sem o Financeiro, nenhum valor em dinheiro aparece (DSH-06)', () => {
    renderPage(['operator']);
    expect(screen.getByText('Serviços por mês')).toBeInTheDocument();
    expect(screen.queryByText('Honorários recebidos')).not.toBeInTheDocument();
  });

  it('serviços por tipo: parcela, últimos 12 meses e a linha abre a lista filtrada (AD-253)', () => {
    renderPage(['operator']);
    expect(screen.getByRole('link', { name: /Perícia\s*9\s*75% · 7 em 12 meses/ })).toHaveAttribute(
      'href',
      '/expert-cases?{"role":["court_expert"]}',
    );
    expect(screen.getByRole('link', { name: /Parceria/ })).toHaveAttribute(
      'href',
      '/expert-cases?{"serviceType":["Parceria"]}',
    );
  });

  it('categorias: recebido e despesas do período com a variação contra o anterior (AD-253)', () => {
    renderPage(['admin']);
    expect(screen.getByText('Receitas e despesas por categoria')).toBeInTheDocument();
    expect(screen.getByText(/\+R\$\s?2\s?mil · \+100%/)).toBeInTheDocument();
    expect(screen.getAllByText('Novo no período').length).toBeGreaterThan(0);
    // One expense category: the total and its row have the same change.
    expect(screen.getAllByText(/-R\$\s?500 · -50%/)).toHaveLength(2);
  });
});
