// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Card asPage needs the router hooks; its back link becomes a plain <a>.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/automation/rules' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
  };
});

const { AutomationRulesPage } = await import('./index.js');

describe('AutomationRulesPage', () => {
  afterEach(cleanup);

  it('mostra o que cada movimentação traz', () => {
    render(<AutomationRulesPage />);
    expect(screen.getByText('Processo suspenso ou sobrestado')).toBeInTheDocument();
    expect(screen.getByText('Mudar a situação para Suspenso')).toBeInTheDocument();
    expect(screen.getByText('Alvará expedido ou RPV e precatório pagos')).toBeInTheDocument();
  });
});
