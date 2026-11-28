// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type TrackedCase } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { courtProcessQuery, trackedCasesQuery } from '../../../../../query/automation.js';
import { notificationsQuery } from '../../../../../query/notification.js';
import { sessionQuery } from '../../../../../query/session.js';
import { CaseCourt } from './case-court.js';

const NUMBER = '0017068-93.2025.5.16.0008';

const renderCourt = (tracked: TrackedCase[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: {
      id: 't1',
      name: 'Perícias Silva',
      status: 'active',
      automationUntil: new Date(Date.now() + 86_400_000).toISOString(),
    },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role: ['admin'],
    permissions: effectivePermissions(['admin']),
  });
  queryClient.setQueryData(courtProcessQuery('c1').queryKey, null);
  queryClient.setQueryData(trackedCasesQuery({ q: NUMBER, limit: 5 }).queryKey, {
    items: tracked,
    total: tracked.length,
  });
  queryClient.setQueryData(
    notificationsQuery({ caseId: 'c1', kind: ['suggestion'], state: 'open', limit: 100 }).queryKey,
    { items: [], total: 0 } as never,
  );
  render(
    <QueryClientProvider client={queryClient}>
      <CaseCourt caseId="c1" processNumber={NUMBER} />
    </QueryClientProvider>,
  );
};

describe('CaseCourt sem movimentos (PAC-02)', () => {
  afterEach(cleanup);

  it('mostra a mesma situação da página da Automação', () => {
    renderCourt([
      {
        caseId: 'c1',
        caseLabel: '0017068-93.2025.5.16.0008',
        court: 'TRT16',
        status: 'not_found',
        syncedAt: new Date().toISOString(),
      },
    ]);
    expect(screen.getByText('Não encontrado no tribunal')).toBeInTheDocument();
    expect(screen.getByText(/o processo pode ser sigiloso/)).toBeInTheDocument();
  });

  it('fora da lista, aguarda a primeira consulta', () => {
    renderCourt([]);
    expect(screen.getByText('Aguardando a primeira consulta')).toBeInTheDocument();
    expect(screen.getByText(/de madrugada/)).toBeInTheDocument();
  });
});
