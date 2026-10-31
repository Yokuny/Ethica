// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { accountKeys, calendarFeedUrl } from '../@query/account.js';
import { AccountCalendarFeed } from './account-calendar-feed.js';

const renderFeed = (active: boolean) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(accountKeys.calendarFeed, { active });
  render(
    <QueryClientProvider client={queryClient}>
      <AccountCalendarFeed />
    </QueryClientProvider>,
  );
};

describe('AccountCalendarFeed (PRZ-03)', () => {
  afterEach(cleanup);

  it('sem link: oferece gerar e não mostra revogar', () => {
    renderFeed(false);
    expect(screen.getByText('Nenhum link gerado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revogar link' })).not.toBeInTheDocument();
  });

  it('com link ativo: não mostra o link de novo, oferece gerar novo e revogar', () => {
    renderFeed(true);
    expect(screen.getByRole('button', { name: 'Gerar novo link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revogar link' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('a URL do feed é absoluta (o calendário externo busca de fora do navegador)', () => {
    expect(calendarFeedUrl('abc')).toMatch(/^https?:\/\/.+\/agenda\/feed\/abc\.ics$/);
  });
});
