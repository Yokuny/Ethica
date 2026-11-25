// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionQuery } from '@/query/session.js';
import { categoriesQuery, financeSummaryQuery, monthlyFlowQuery, revenueGoalQuery } from '@/query/transaction.js';
import { dashboardSearchSchema } from './@interface/dashboard.interface.js';
import { caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/dashboard' }),
    useMatches: () => [],
    useSearch: () => ({ months: 6 }),
    useNavigate: () => vi.fn(),
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, search, children }: { to: string; search?: object; children?: ReactNode }) => (
      <a href={search ? `${to}?${JSON.stringify(search)}` : to}>{children}</a>
    ),
  };
});

const { DashboardPage } = await import('./index.js');

// 12 complete months up to 2026-11 (the 6-month period and the previous 6) and 2026-12 in progress, which the page
// leaves out of every number.
const MONTHS = Array.from({ length: 13 }, (_, index) =>
  new Date(Date.UTC(2025, 11 + index, 1)).toISOString().slice(0, 7),
);
const recent = (index: number) => index >= 6 && index < 12;
const current = (index: number) => index === 12;

const renderPage = (role: Role[], goalCents?: number) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active' },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role,
    permissions: effectivePermissions(role),
  } as never);
  queryClient.setQueryData(caseDashboardQuery.queryKey, {
    total: 30,
    closed: 10,
    byType: [
      { role: 'court_expert', count: 21 },
      { role: 'other', serviceType: 'Parceria', count: 9 },
    ],
    byMonth: MONTHS.map((month, index) => ({
      month,
      count: current(index) ? 50 : recent(index) ? 2 : 1,
      byType: [{ role: 'court_expert' as const, count: current(index) ? 50 : recent(index) ? 2 : 1 }],
    })),
  });
  queryClient.setQueryData(
    monthlyFlowQuery(13).queryKey,
    MONTHS.map((month, index) => ({
      month,
      receivedCents: current(index) ? 9_999_900 : recent(index) ? 100_000 : 50_000,
      receivableCents: 10_000,
      expensesCents: 20_000,
    })),
  );
  queryClient.setQueryData(feesDashboardQuery.queryKey, { receivableCents: 80_000, receivedCents: 2_500_000 });
  queryClient.setQueryData(financeSummaryQuery.queryKey, {
    receivableCents: 80_000,
    lateCents: 30_000,
    receivedMonthCents: 100_000,
    expensesMonthCents: 20_000,
  });
  queryClient.setQueryData(categoriesQuery('income', 6).queryKey, [
    { category: 'fixed_fees', totalCents: 400_000, previousCents: 200_000 },
    { category: 'contracted_fees', totalCents: 200_000, previousCents: 0 },
  ]);
  queryClient.setQueryData(categoriesQuery('expense', 6).queryKey, [
    { category: 'travel', totalCents: 120_000, previousCents: 240_000 },
  ]);
  queryClient.setQueryData(revenueGoalQuery().queryKey, {
    year: 2026,
    currentYear: 2026,
    years: [2026],
    byMonth: MONTHS.slice(1).map((month) => ({ month, receivedCents: 900_000 })),
    receivedCents: 10_800_000,
    monthsLeft: 2,
    ...(goalCents ? { goalCents, expectedCents: (goalCents * 11) / 12, perMonthCents: 600_000 } : {}),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
};

describe('Dashboard (DSH, AD-255)', () => {
  afterEach(cleanup);

  it('nível 1: saldo, recebido e despesas do período com a variação e o alerta do vencido', () => {
    renderPage(['admin']);
    const overview = screen.getByRole('group', { name: 'Visão geral' });
    // Received 6 × 1.000 = 6.000 (+100% against 3.000); expenses 1.200 (=); balance 4.800.
    expect(overview).toHaveTextContent(/Recebido.*\+100%.*6\.000,00/);
    expect(overview).toHaveTextContent(/Saldo.*4\.800,00/);
    expect(overview).toHaveTextContent(/Serviços novos.*\+100%.*12/);
    // DSH-02: received since the start stays in the strip.
    expect(overview).toHaveTextContent(/25\.000,00 desde o início/);
    // The overdue part on its own line under A receber.
    expect(overview).toHaveTextContent(/A receber.*800,00.*300,00 atrasado/);
    expect(screen.getByRole('link', { name: /300,00 em honorários vencidos/ })).toHaveAttribute(
      'href',
      '/finance?{"state":"overdue"}',
    );
  });

  it('dinheiro: categorias em rosca com a variação contra o período anterior', () => {
    renderPage(['admin']);
    expect(screen.getByText('De onde vem o dinheiro')).toBeInTheDocument();
    expect(screen.getAllByText('+100%').length).toBeGreaterThan(0);
    expect(screen.getByText('Novo no período')).toBeInTheDocument();
    // One expense category: the center and its legend row have the same change.
    expect(screen.getAllByText('-50%')).toHaveLength(2);
  });

  it('trabalho: o mix de serviços abre a lista filtrada pelo tipo', () => {
    renderPage(['operator']);
    expect(screen.getByRole('link', { name: /Perícia\s*21\s*70%/ })).toHaveAttribute(
      'href',
      '/expert-cases?{"role":["court_expert"]}',
    );
    expect(screen.getByRole('link', { name: /Parceria/ })).toHaveAttribute(
      'href',
      '/expert-cases?{"serviceType":["Parceria"]}',
    );
  });

  it('sem o Financeiro, nenhum valor em dinheiro nem alerta aparece (DSH-06)', () => {
    renderPage(['operator']);
    expect(screen.getByText('Entrada de serviços')).toBeInTheDocument();
    expect(screen.queryByText('De onde vem o dinheiro')).not.toBeInTheDocument();
    expect(screen.queryByText(/honorários vencidos/)).not.toBeInTheDocument();
    // The strip keeps only the work number.
    expect(screen.getByRole('group', { name: 'Visão geral' })).not.toHaveTextContent('R$');
  });

  it('meta do ano: depois do Fluxo de caixa, com a barra vertical; sem meta o painel não aparece (AD-260, AD-261)', () => {
    renderPage(['admin'], 12_000_000);
    const cashFlow = screen.getByText('Fluxo de caixa');
    const goal = screen.getByText('Meta de 2026');
    expect(cashFlow.compareDocumentPosition(goal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Meta do ano' })).toHaveAttribute('aria-valuenow', '10800000');
    expect(screen.getByText('90% atingido')).toBeInTheDocument();
    cleanup();
    renderPage(['admin']);
    expect(screen.queryByText('Meta de 2026')).not.toBeInTheDocument();
  });

  it('período na URL como número (?months=6); link antigo em texto e valor estranho caem no padrão', () => {
    expect(dashboardSearchSchema.parse({ months: 12 })).toEqual({ months: 12 });
    expect(dashboardSearchSchema.parse({ months: '12' })).toEqual({ months: 12 });
    expect(dashboardSearchSchema.parse({})).toEqual({ months: 6 });
    expect(dashboardSearchSchema.parse({ months: '7' })).toEqual({ months: 6 });
  });
});
