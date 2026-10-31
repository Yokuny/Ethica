// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrazoRecord } from '@/query/prazo.js';
import { MonthView } from './month-view.js';

const prazo = (id: string, vencimento: string): PrazoRecord => ({
  id,
  periciaId: 'p1',
  periciaNumero: '0001234-56.2026.5.02.0001',
  titulo: `Prazo ${id}`,
  vencimento,
  status: 'pendente',
});

// PRZ-01.6: o calendário mostra os prazos pendentes no dia do vencimento.
describe('MonthView com prazos', () => {
  afterEach(cleanup);

  it('mostra cada prazo no dia do vencimento e abre o prazo ao clicar', () => {
    const onSelectPrazo = vi.fn();
    render(
      <MonthView
        month="2026-11-15"
        items={[]}
        onSelect={vi.fn()}
        prazos={[prazo('a', '2026-11-10'), prazo('b', '2026-11-20')]}
        onSelectPrazo={onSelectPrazo}
        today="2026-11-15"
      />,
    );

    const dia10 = screen.getByTestId('month-view-day-2026-11-10');
    expect(within(dia10).getByText(/Prazo a/)).toBeInTheDocument();
    expect(within(dia10).queryByText(/Prazo b/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('month-view-day-2026-11-20')).getByText(/Prazo b/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('calendar-prazo-b'));
    expect(onSelectPrazo).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('prazo vencido (antes de hoje) ganha o destaque de erro', () => {
    render(
      <MonthView
        month="2026-11-15"
        items={[]}
        onSelect={vi.fn()}
        prazos={[prazo('a', '2026-11-10')]}
        today="2026-11-15"
      />,
    );
    expect(screen.getByTestId('calendar-prazo-a')).toHaveClass('text-destructive');
  });
});
