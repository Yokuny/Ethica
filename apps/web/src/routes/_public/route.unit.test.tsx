// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();
vi.mock('@/lib/api/client.api.js', () => ({ post: postMock }));

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
const { AboutPage } = await import('./about/index.js');
const { SecurityPage } = await import('./security/index.js');
const { TermsPage } = await import('./terms/index.js');
const { ContactPage } = await import('./contact/index.js');

describe('public pages', () => {
  afterEach(() => {
    cleanup();
    postMock.mockReset();
  });

  it('footer leads to every public page', () => {
    render(<PublicFooter />);
    const links = screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);
    expect(links).toEqual(
      expect.arrayContaining([
        ['Sobre', '/about'],
        ['Novidades', '/news'],
        ['Segurança', '/security'],
        ['Suporte', '/support'],
        ['Contato', '/contact'],
        ['Termos de uso', '/terms'],
        ['Política de privacidade', '/privacy'],
      ]),
    );
  });

  it('about tells what the Ethica is and who it serves', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sobre o Ethica' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Perito judicial' })).toBeInTheDocument();
  });

  it('security tells what the system does; terms show the draft notice', () => {
    render(<SecurityPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Segurança' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrada sem senha' })).toBeInTheDocument();
    cleanup();
    render(<TermsPage />);
    expect(screen.getByText(/Texto em elaboração/)).toBeInTheDocument();
  });

  it('contact: sends the message and shows the confirmation (PUB-01, PUB-02)', async () => {
    postMock.mockResolvedValue({ success: true, data: { sent: true } });
    const user = userEvent.setup();
    render(<ContactPage />);

    await user.type(screen.getByLabelText('Nome'), 'Ana Perita');
    await user.type(screen.getByLabelText('E-mail'), 'ana@perita.com');
    await user.type(screen.getByLabelText('Telefone'), '11 99999-0000');
    await user.type(screen.getByLabelText('Mensagem'), 'Quero saber do plano anual.');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/contact', {
        name: 'Ana Perita',
        email: 'ana@perita.com',
        phone: '11 99999-0000',
        subject: 'support',
        message: 'Quero saber do plano anual.',
      }),
    );
    expect(await screen.findByText('Mensagem enviada')).toBeInTheDocument();
  });

  it('contact: shows the API error and keeps the form (PUB-03)', async () => {
    postMock.mockResolvedValue({ success: false, message: 'O envio de mensagens está indisponível no momento.' });
    const user = userEvent.setup();
    render(<ContactPage />);
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('E-mail'), 'ana@perita.com');
    await user.type(screen.getByLabelText('Telefone'), '11 99999-0000');
    await user.type(screen.getByLabelText('Mensagem'), 'Oi');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('indisponível');
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeInTheDocument();
  });
});
