// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatedNotificationRecord } from '@/query/notification.js';
import { NotificationDialog } from './notification-dialog.js';

const session = vi.hoisted(() => ({ canUpdate: true }));

vi.mock('@/query/session.js', () => ({
  sessionQuery: { queryKey: ['session'], queryFn: () => ({}) },
  can: () => session.canUpdate,
}));

const ALERT: DatedNotificationRecord = {
  id: 'a',
  caseId: 'p1',
  kind: 'alert',
  module: 'expert_cases',
  source: 'user',
  open: true,
  date: '2000-01-01',
  createdAt: '2000-01-01T12:00:00.000Z',
  title: 'Cobrar o depósito',
  dueDate: '2030-01-10',
  status: 'pending',
};

const renderDialog = (deadline: DatedNotificationRecord) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(['session'], {});
  render(
    <QueryClientProvider client={queryClient}>
      <NotificationDialog deadline={deadline} onClose={() => undefined} />
    </QueryClientProvider>,
  );
};

describe('NotificationDialog: adiar', () => {
  afterEach(() => {
    cleanup();
    session.canUpdate = true;
  });

  it('pendente: "Adiar" abre o novo vencimento, com a confirmação travada até escolher a data', () => {
    renderDialog(ALERT);
    fireEvent.click(screen.getByRole('button', { name: 'Adiar' }));
    expect(screen.getByText('Novo vencimento (depois do atual)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adiar' })).toBeDisabled();
  });

  it('resolvido ou sem permissão de alterar: não oferece adiar', () => {
    renderDialog({ ...ALERT, status: 'done' });
    expect(screen.queryByRole('button', { name: 'Adiar' })).not.toBeInTheDocument();
    cleanup();
    session.canUpdate = false;
    renderDialog(ALERT);
    expect(screen.queryByRole('button', { name: 'Adiar' })).not.toBeInTheDocument();
  });
});

describe('NotificationDialog: cancelar (AD-263)', () => {
  afterEach(cleanup);

  it('pendente oferece "Marcar como cancelado"; resolvido não', () => {
    renderDialog(ALERT);
    expect(screen.getByRole('button', { name: 'Marcar como cancelado' })).toBeInTheDocument();
    cleanup();
    renderDialog({ ...ALERT, status: 'done' });
    expect(screen.queryByRole('button', { name: 'Marcar como cancelado' })).not.toBeInTheDocument();
  });
});
