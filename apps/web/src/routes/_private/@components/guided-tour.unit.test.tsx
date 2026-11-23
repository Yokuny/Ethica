// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { effectivePermissions, type Role } from '@ethica/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionQuery } from '../../../query/session.js';

// Without the shell, the menu is absent: every step shows centered.
vi.mock('@ethica/ui/components/sidebar', () => ({ useSidebar: () => ({ isMobile: false }) }));
const patch = vi.fn();
vi.mock('../../../lib/api/client.api.js', () => ({ get: vi.fn(), patch: (...args: unknown[]) => patch(...args) }));

const { GuidedTour } = await import('./guided-tour.js');

const renderTour = (role: Role[], onboardingDismissed = false) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(sessionQuery.queryKey, {
    tenant: { id: 't1', name: 'Perícias Silva', status: 'active' },
    user: { id: 'u1', name: 'Ana', email: 'ana@pericias.com' },
    role,
    permissions: effectivePermissions(role),
  });
  queryClient.setQueryData(['preferences'], { onboardingDismissed, deadlineReminderEmail: true, hiddenBlocks: [] });
  render(
    <QueryClientProvider client={queryClient}>
      <GuidedTour />
    </QueryClientProvider>,
  );
};

// Walks the tour to the end collecting the step titles.
const walkTitles = () => {
  const titles: string[] = [];
  for (;;) {
    titles.push(screen.getAllByText(/./, { selector: '[data-slot="item-title"]' })[0]?.textContent ?? '');
    const next = screen.queryByRole('button', { name: 'Próximo' });
    if (!next) return titles;
    fireEvent.click(next);
  }
};

describe('GuidedTour', () => {
  afterEach(() => {
    cleanup();
    patch.mockReset();
  });

  it('não abre para quem já viu o tour', () => {
    renderTour(['admin'], true);
    expect(screen.queryByText('Boas-vindas ao Ethica')).not.toBeInTheDocument();
  });

  it('admin vê as seções, o escritório e a conta', () => {
    renderTour(['admin']);
    expect(screen.getByText('1 de 10')).toBeInTheDocument();
    expect(walkTitles()).toEqual([
      'Boas-vindas ao Ethica',
      'Serviços',
      'Notificações',
      'Agenda',
      'Logística',
      'Laudos',
      'Financeiro',
      'Automação Datajud',
      'Seu escritório',
      'Sua conta',
    ]);
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument();
  });

  it('operador não vê financeiro nem o escritório', () => {
    renderTour(['operator']);
    const titles = walkTitles();
    expect(titles).not.toContain('Financeiro');
    expect(titles).not.toContain('Seu escritório');
    expect(titles.at(-1)).toBe('Sua conta');
  });

  it('destaca o item do menu do passo e tira o destaque ao avançar', () => {
    // jsdom has no layout: the item reports a box, as a visible menu item does.
    const menuItem = document.createElement('li');
    menuItem.setAttribute('data-tour', '/expert-cases');
    menuItem.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList;
    document.body.append(menuItem);
    renderTour(['admin']);

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText('Serviços')).toBeInTheDocument();
    expect(menuItem).toHaveAttribute('data-tour-active');

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    expect(menuItem).not.toHaveAttribute('data-tour-active');
    menuItem.remove();
  });

  it('no celular, seção sem botão na barra de baixo destaca o Menu', () => {
    const dockMenu = document.createElement('button');
    dockMenu.setAttribute('data-tour', 'menu');
    dockMenu.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList;
    document.body.append(dockMenu);
    renderTour(['admin']);

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    expect(dockMenu).toHaveAttribute('data-tour-active');
    dockMenu.remove();
  });

  it('Pular grava que a pessoa já viu o tour e fecha', async () => {
    patch.mockResolvedValue({
      success: true,
      data: { onboardingDismissed: true, deadlineReminderEmail: true, hiddenBlocks: [] },
    });
    renderTour(['admin']);
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }));

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/me/preferences', { onboardingDismissed: true }));
    await waitFor(() => expect(screen.queryByText('Boas-vindas ao Ethica')).not.toBeInTheDocument());
  });
});
