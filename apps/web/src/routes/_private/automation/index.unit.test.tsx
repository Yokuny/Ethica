// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { type AutomationDashboard, effectivePermissions } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { automationDashboardQuery, trackedCasesQuery } from '../../../query/automation.js';
import { sessionQuery } from '../../../query/session.js';
import { automationSearchSchema } from './@interface/automation.interface.js';

// Card asPage needs the router hooks; Link becomes a plain <a> to check the destinations.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/automation' }),
    useMatches: () => [],
    useSearch: () => automationSearchSchema.parse({}),
    useNavigate: () => vi.fn(),
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, search, children }: { to: string; search?: object; children?: ReactNode }) => (
      <a href={search && typeof search === 'object' ? `${to}?${JSON.stringify(search)}` : to}>{children}</a>
    ),
  };
});

const { AutomationPage } = await import('./index.js');

// 12 complete months up to 2026-10 (the 6-month period and the previous 6) and 2026-11 in progress, left out.
const MONTHS = Array.from({ length: 13 }, (_, index) =>
  new Date(Date.UTC(2025, 10 + index, 1)).toISOString().slice(0, 7),
);
const recent = (index: number) => index >= 6 && index < 12;
const DASHBOARD: AutomationDashboard = {
  since: '2025-11-01',
  tracked: { total: 4, byState: { synced: 2, not_found: 1, stale: 0, waiting: 1 } },
  pending: 3,
  byMonth: MONTHS.map((month, index) => ({
    month,
    movements: index === 12 ? 90 : recent(index) ? 4 : 2,
    notices: recent(index) ? 2 : 1,
    roundDays: 30,
    completeDays: index === 11 ? 28 : 30,
    suggestions: recent(index) ? 1 : 0,
    byStatus: recent(index) ? { accepted: 1 } : {},
  })),
};

const renderPage = (automationUntil?: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active', automationUntil },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role: ['admin'],
    permissions: effectivePermissions(['admin']),
  });
  queryClient.setQueryData(automationDashboardQuery.queryKey, DASHBOARD);
  queryClient.setQueryData(trackedCasesQuery({ page: 1, limit: 20 }).queryKey, {
    items: [
      {
        caseId: 'c1',
        caseLabel: '0024364-65.2020.5.24.0091',
        court: 'TRT24',
        status: 'synced',
        syncedAt: new Date().toISOString(),
        lastMovementAt: '2026-11-20T10:00:00.000Z',
        lastMovementName: 'Alvará',
      },
      { caseId: 'c2', caseLabel: '0017068-93.2025.5.16.0008', court: 'TRT16', status: 'not_found' },
    ],
    total: 2,
  });
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

  it('faixa do período (PAT-01): o que a automação fez contra o anterior e Para aprovar levando à Central', () => {
    renderPage(new Date(Date.now() + 86_400_000).toISOString());
    const strip = screen.getByRole('group', { name: 'Visão geral' });
    // 6 complete months of 4 movements (the month in progress, with 90, stays out).
    expect(within(strip).getByText('24')).toBeInTheDocument();
    expect(within(strip).getByText('1 pedem atenção')).toBeInTheDocument();
    expect(within(strip).getByText('6 aprovadas')).toBeInTheDocument();
    expect(within(strip).getByText('3').closest('a')).toHaveAttribute('href', '/notifications?{"kind":["suggestion"]}');
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument();
  });

  it('atividade, roscas e a lista dos processos pela última movimentação (PAT-03 a PAT-05)', () => {
    renderPage(new Date(Date.now() + 86_400_000).toISOString());
    expect(screen.getByText('Atividade da automação')).toBeInTheDocument();
    // Days every case got an answer out of the days with a run, in the period.
    expect(screen.getByText('178 de 180 dias')).toBeInTheDocument();
    expect(screen.getByText('O que aconteceu com as sugestões')).toBeInTheDocument();
    expect(screen.getByText('Situação dos processos')).toBeInTheDocument();
    expect(screen.queryByText(/contados/)).not.toBeInTheDocument();
    const row = screen.getByText('0024364-65.2020.5.24.0091').closest('tr');
    expect(row).toHaveTextContent('Alvará');
    expect(row).toHaveTextContent('Consultado');
    expect(screen.getByText('0017068-93.2025.5.16.0008').closest('tr')).toHaveTextContent('Não encontrado no tribunal');
  });
});
