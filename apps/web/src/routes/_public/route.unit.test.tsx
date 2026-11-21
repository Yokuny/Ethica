// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ to, children, className }: { to: string; children?: unknown; className?: string }) => (
      <a href={to} className={className}>
        {children as string}
      </a>
    ),
  };
});

const { PublicFooter } = await import('./@components/public-footer.js');
const { SecurityPage } = await import('./security/index.js');
const { TermsPage } = await import('./terms/index.js');

describe('public pages', () => {
  afterEach(cleanup);

  it('footer leads to every public page', () => {
    render(<PublicFooter />);
    const links = screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);
    expect(links).toEqual(
      expect.arrayContaining([
        ['Novidades', '/news'],
        ['Segurança', '/security'],
        ['Suporte', '/support'],
        ['Contato', '/contact'],
        ['Termos de uso', '/terms'],
        ['Política de privacidade', '/privacy'],
      ]),
    );
  });

  it('security tells what the system does; terms show the draft notice', () => {
    render(<SecurityPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Segurança' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrada sem senha' })).toBeInTheDocument();
    cleanup();
    render(<TermsPage />);
    expect(screen.getByText(/Texto em elaboração/)).toBeInTheDocument();
  });
});
