// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CashFlowTable } from './cash-flow-table.js';

afterEach(cleanup);

const row = (month: string, receivedCents: number, expensesCents: number) => ({
  month,
  receivedCents,
  receivableCents: 0,
  expensesCents,
});

describe('CashFlowTable', () => {
  it('shows the months newest first, without the base month, each value with its change', () => {
    render(
      <CashFlowTable data={[row('2026-08', 50000, 0), row('2026-09', 10000, 0), row('2026-10', 30000, 213213)]} />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByRole('rowheader')).toHaveTextContent(/outubro de 2026/i);
    expect(within(rows[0] as HTMLElement).getByRole('rowheader')).toHaveTextContent('Em andamento');
    expect(within(rows[1] as HTMLElement).getByRole('rowheader')).toHaveTextContent(/setembro de 2026/i);
    expect(screen.queryByText(/agosto/i)).not.toBeInTheDocument();
    // September received R$ 100 against R$ 500 in August.
    expect(rows[1]).toHaveTextContent('R$ 100,00');
    expect(rows[1]).toHaveTextContent('-R$ 400');
  });

  it('sums the period balance as received minus expenses', () => {
    render(<CashFlowTable data={[row('2026-09', 0, 0), row('2026-10', 12323, 213213)]} />);
    expect(screen.getByText('Saldo do período (recebido menos despesas)').nextSibling).toHaveTextContent(
      '-R$ 2.008,90',
    );
  });
});
