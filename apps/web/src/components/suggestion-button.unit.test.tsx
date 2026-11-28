// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CaseRecord } from '../query/case.js';
import { type NotificationRecord, notificationsQuery } from '../query/notification.js';
import { sessionQuery } from '../query/session.js';
import { SuggestionButton, suggestionsFor, useCaseSuggestions } from './suggestion-button.js';

const suggestion = (id: string, proposal: NotificationRecord['proposal']): NotificationRecord => ({
  id,
  kind: 'suggestion',
  module: 'expert_cases',
  source: 'datajud',
  open: true,
  date: '2026-11-20',
  status: 'pending',
  caseId: 'c1',
  proposal,
  evidence: {
    court: 'TRT16',
    movement: { key: id, code: 272, name: 'Suspensão', at: '2026-11-20T10:00:00Z', complements: [] },
  },
  createdAt: '2026-11-21T10:00:00Z',
});
const suspend = suggestion('s1', { target: 'case_status', value: 'suspended' });
const phase = suggestion('s2', { target: 'case_phase', value: 'evidence_closed' });

const clientWith = (items: NotificationRecord[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active', automationUntil: '2099-01-01T00:00:00Z' },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role: ['admin'],
    permissions: effectivePermissions(['admin']),
  });
  queryClient.setQueryData(
    notificationsQuery({ caseId: 'c1', kind: ['suggestion'], state: 'open', limit: 100 }).queryKey,
    { items, total: items.length } as never,
  );
  return queryClient;
};

describe('botão de sugestão (SGD-01)', () => {
  afterEach(cleanup);

  it('sem sugestão não aparece; no cabeçalho mostra quantas são', () => {
    const queryClient = clientWith([]);
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SuggestionButton suggestions={[]} />
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    render(
      <QueryClientProvider client={queryClient}>
        <SuggestionButton suggestions={[suspend, phase]} count />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /2 Sugestões/ })).toHaveClass('suggestion-glow');
  });

  it('esconde a sugestão que já não cabe no serviço e separa por dado', () => {
    const queryClient = clientWith([suspend, phase]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    // The status was changed by hand to Suspenso: only the phase suggestion is left.
    const legalCase = {
      id: 'c1',
      serviceType: 'expert_examination',
      status: 'suspended',
      phase: 'drafting_report',
    } as CaseRecord;
    const { result } = renderHook(() => useCaseSuggestions('c1', legalCase), { wrapper });
    expect(result.current.map((item) => item.id)).toEqual(['s2']);
    expect(suggestionsFor([suspend, phase], 'case_status').map((item) => item.id)).toEqual(['s1']);
  });
});
