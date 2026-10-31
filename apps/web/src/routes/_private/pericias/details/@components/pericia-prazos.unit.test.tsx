// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { type PrazoRecord, prazosDaPericiaQuery } from '@/query/prazo.js';
import { PericiaPrazos } from './pericia-prazos.js';

const today = formatDisplayDate(new Date());

const renderPrazos = (prazos: PrazoRecord[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(prazosDaPericiaQuery('p1').queryKey, prazos);
  render(
    <QueryClientProvider client={queryClient}>
      <PericiaPrazos periciaId="p1" />
    </QueryClientProvider>,
  );
};

describe('PericiaPrazos (PRZ-01)', () => {
  afterEach(cleanup);

  it('lista cada prazo com status; vencido pendente ganha o selo "Vencido"; protocolado mostra a data', () => {
    renderPrazos([
      { id: 'a', periciaId: 'p1', titulo: 'Entrega do laudo', vencimento: '2000-01-10', status: 'pendente' },
      {
        id: 'b',
        periciaId: 'p1',
        titulo: 'Esclarecimentos',
        vencimento: '2000-01-05',
        status: 'protocolado',
        protocoladoEm: '2000-01-04',
      },
      { id: 'c', periciaId: 'p1', titulo: 'Impugnação', vencimento: today, status: 'perdido' },
    ]);

    const laudo = screen.getByText('Entrega do laudo').closest('li') as HTMLElement;
    expect(within(laudo).getByText('Pendente')).toBeInTheDocument();
    expect(within(laudo).getByText('Vencido')).toBeInTheDocument();

    const esclarecimentos = screen.getByText('Esclarecimentos').closest('li') as HTMLElement;
    expect(within(esclarecimentos).getByText('Protocolado')).toBeInTheDocument();
    expect(within(esclarecimentos).getByText(/Protocolado em 4 jan 2000/)).toBeInTheDocument();
    expect(within(esclarecimentos).queryByText('Vencido')).not.toBeInTheDocument();

    const impugnacao = screen.getByText('Impugnação').closest('li') as HTMLElement;
    expect(within(impugnacao).getByText('Perdido')).toBeInTheDocument();
    expect(within(impugnacao).queryByText('Vence em breve')).not.toBeInTheDocument();
  });

  it('sem prazos mostra o vazio e a ação de adicionar', () => {
    renderPrazos([]);
    expect(screen.getByText('Nenhum prazo cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar prazo' })).toBeInTheDocument();
  });
});
