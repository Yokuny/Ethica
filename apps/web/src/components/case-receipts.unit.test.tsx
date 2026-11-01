// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionQuery } from '@/query/session.js';
import { transactionsQuery } from '@/query/transaction.js';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, ...props }: { children?: ReactNode }) => <a {...props}>{children}</a>,
}));

const { CaseReceipts } = await import('./case-receipts.js');

const renderReceipts = (role: Role[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    user: { id: 'u1', name: 'Ana', email: 'a@x.com' },
    role,
    permissions: effectivePermissions(role),
  });
  queryClient.setQueryData(transactionsQuery({ caseId: 'p1', kind: 'income', limit: 20 }).queryKey, {
    total: 1,
    items: [
      {
        id: 'l1',
        kind: 'income',
        category: 'fixed_fees',
        description: 'Honorários fixados',
        amountCents: 480_000,
        dueDate: '2999-01-01',
        status: 'partial',
        installments: [{ id: 'x1', amountCents: 150_000, data: '2026-10-13', account: 'Banco do Brasil' }],
        receivedCents: 150_000,
        balanceCents: 330_000,
      },
    ],
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CaseReceipts caseId="p1" />
    </QueryClientProvider>,
  );
  return view;
};

describe('PericiaRecebimentos (recebimentos no detalhe do evento da agenda)', () => {
  afterEach(cleanup);

  it('admin e manager veem o honorário com status, recebido, saldo e cada parcela', () => {
    renderReceipts(['manager']);
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText(/Recebido R\$\s?1\.500,00 · Saldo a receber R\$\s?3\.300,00/)).toBeInTheDocument();
    expect(screen.getByText(/13 out 2026 · R\$\s?1\.500,00 · Banco do Brasil/)).toBeInTheDocument();
  });

  it('operador não vê o financeiro (AD-107): nada é renderizado', () => {
    const { container } = renderReceipts(['operator']);
    expect(container).toBeEmptyDOMElement();
  });
});
