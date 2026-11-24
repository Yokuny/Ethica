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
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  queryClient.setQueryData(trackedCasesQuery.queryKey, [
    { caseId: 'c1', caseLabel: '0024364-65.2020.5.24.0091', court: 'TRT24', status: 'synced', syncedAt: daysAgo(1) },
    { caseId: 'c2', caseLabel: '0000010-00.2026.5.24.0001', court: 'TRT24', status: 'waiting' },
    { caseId: 'c3', caseLabel: '0017068-93.2025.5.16.0008', court: 'TRT16', status: 'not_found', syncedAt: daysAgo(1) },
    { caseId: 'c4', caseLabel: '0000020-00.2026.5.24.0001', court: 'TRT24', status: 'synced', syncedAt: daysAgo(5) },
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

  it('mostra a situação de cada processo, primeiro o que pede atenção (PAC-02)', () => {
    renderPage(new Date(Date.now() + 86_400_000).toISOString());
    const rows = screen.getAllByRole('listitem').filter((row) => row.textContent?.includes('TRT'));
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^0017068-93\.2025\.5\.16\.0008.*Não encontrado no tribunal$/),
      expect.stringMatching(/^0000020-00\.2026\.5\.24\.0001.*Sem resposta do tribunal$/),
      expect.stringMatching(/^0000010-00\.2026\.5\.24\.0001.*Aguardando a primeira consulta$/),
      expect.stringMatching(/^0024364-65\.2020\.5\.24\.0091.*Consultado$/),
    ]);
    expect(rows[0]).toHaveTextContent('o processo pode ser sigiloso');
    expect(rows[1]).toHaveTextContent('Sem resposta do tribunal desde');
    expect(rows[2]).toHaveTextContent('A consulta é feita uma vez por dia, de madrugada.');
    expect(rows[3]).toHaveTextContent('última consulta em');
  });
});
