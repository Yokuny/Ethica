// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { permissoesEfetivas, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lancamentosQuery } from '@/query/lancamento.js';
import { sessionQuery } from '@/query/session.js';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, ...props }: { children?: ReactNode }) => <a {...props}>{children}</a>,
}));

const { PericiaRecebimentos } = await import('./pericia-recebimentos.js');

const renderRecebimentos = (role: Role[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    user: { id: 'u1', name: 'Ana', email: 'a@x.com' },
    role,
    permissoes: permissoesEfetivas(role),
  });
  queryClient.setQueryData(lancamentosQuery({ periciaId: 'p1', natureza: 'income', limit: 20 }).queryKey, {
    total: 1,
    items: [
      {
        id: 'l1',
        natureza: 'income',
        categoria: 'fixed_fees',
        descricao: 'Honorários fixados',
        valorCents: 480_000,
        vencimento: '2999-01-01',
        status: 'partial',
        parcelas: [{ id: 'x1', valorCents: 150_000, data: '2026-10-13', conta: 'Banco do Brasil' }],
        recebidoCents: 150_000,
        saldoCents: 330_000,
      },
    ],
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <PericiaRecebimentos periciaId="p1" />
    </QueryClientProvider>,
  );
  return view;
};

describe('PericiaRecebimentos (recebimentos no detalhe do evento da agenda)', () => {
  afterEach(cleanup);

  it('admin e manager veem o honorário com status, recebido, saldo e cada parcela', () => {
    renderRecebimentos(['manager']);
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText(/Recebido R\$\s?1\.500,00 · Saldo a receber R\$\s?3\.300,00/)).toBeInTheDocument();
    expect(screen.getByText(/13 out 2026 · R\$\s?1\.500,00 · Banco do Brasil/)).toBeInTheDocument();
  });

  it('operador não vê o financeiro (AD-107): nada é renderizado', () => {
    const { container } = renderRecebimentos(['operator']);
    expect(container).toBeEmptyDOMElement();
  });
});
