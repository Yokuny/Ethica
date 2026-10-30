// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
  };
});

const { CardHeader } = await import('./page-card.js');

describe('CardHeader description (ENR-01)', () => {
  afterEach(() => cleanup());

  it('shows the purpose sentence as visible text under the title', () => {
    render(<CardHeader title="Clientes" description="Reúna os dados de cada cliente." />);

    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Reúna os dados de cada cliente.')).toBeVisible();
  });

  it('renders no description element when none is given', () => {
    const { container } = render(<CardHeader title="Clientes" />);

    expect(container.querySelector('[data-slot="card-description"]')).toBeNull();
  });
});
