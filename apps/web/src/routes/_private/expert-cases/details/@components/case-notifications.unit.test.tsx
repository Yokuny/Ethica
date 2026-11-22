// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { caseNotificationsQuery, type NotificationRecord } from '@/query/notification.js';
import { CaseNotifications } from './case-notifications.js';

const today = formatDisplayDate(new Date());

const renderDeadlines = (deadlines: NotificationRecord[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(caseNotificationsQuery('p1').queryKey, deadlines);
  render(
    <QueryClientProvider client={queryClient}>
      <CaseNotifications caseId="p1" />
    </QueryClientProvider>,
  );
};

describe('PericiaPrazos (PRZ-01)', () => {
  afterEach(cleanup);

  it('lista cada prazo com status; vencido pendente ganha o selo "Atrasado"; protocolado mostra a data', () => {
    renderDeadlines([
      {
        id: 'a',
        caseId: 'p1',
        kind: 'deadline',
        module: 'expert_cases',
        source: 'user',
        title: 'Entrega do laudo',
        dueDate: '2000-01-10',
        status: 'pending',
      },
      {
        id: 'b',
        caseId: 'p1',
        kind: 'deadline',
        module: 'expert_cases',
        source: 'user',
        title: 'Esclarecimentos',
        dueDate: '2000-01-05',
        status: 'filed',
        filedDate: '2000-01-04',
      },
      {
        id: 'c',
        caseId: 'p1',
        kind: 'deadline',
        module: 'expert_cases',
        source: 'user',
        title: 'Impugnação',
        dueDate: today,
        status: 'missed',
      },
    ]);

    const report = screen.getByText('Entrega do laudo').closest('li') as HTMLElement;
    expect(within(report).getByText('Pendente')).toBeInTheDocument();
    expect(within(report).getByText('Atrasado')).toBeInTheDocument();

    const clarifications = screen.getByText('Esclarecimentos').closest('li') as HTMLElement;
    expect(within(clarifications).getByText('Protocolado')).toBeInTheDocument();
    expect(within(clarifications).getByText(/Protocolado em 4 jan 2000/)).toBeInTheDocument();
    expect(within(clarifications).queryByText('Atrasado')).not.toBeInTheDocument();

    const objection = screen.getByText('Impugnação').closest('li') as HTMLElement;
    expect(within(objection).getByText('Perdido')).toBeInTheDocument();
    expect(within(objection).queryByText('Vence em breve')).not.toBeInTheDocument();
  });

  it('sem prazos mostra o vazio e a ação de adicionar', () => {
    renderDeadlines([]);
    expect(screen.getByText('Nenhum prazo cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar prazo' })).toBeInTheDocument();
  });
});
