// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TransactionRecord } from '@/query/transaction.js';
import { PaymentForm } from './payment-form.js';

const EXPENSE = {
  id: 'l1',
  kind: 'expense',
  category: 'travel',
  description: 'Viagem',
  amountCents: 5_000,
  dueDate: '2026-11-20',
  status: 'expected',
  installments: [],
} as unknown as TransactionRecord;

describe('PaymentForm (AD-201)', () => {
  afterEach(cleanup);

  it('não marca como pago sem a data do pagamento', async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PaymentForm transaction={EXPENSE} onClose={onClose} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('informe a data')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
