// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DefaultEmptyData } from './default-empty-data.js';

describe('DefaultEmptyData', () => {
  afterEach(() => cleanup());

  it('shows the given title and description', () => {
    render(<DefaultEmptyData title="Nenhum cliente cadastrado ainda." description="Cadastre o primeiro." />);

    expect(screen.getByText('Nenhum cliente cadastrado ainda.')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument();
  });

  it('falls back to the default title and description', () => {
    render(<DefaultEmptyData />);

    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
    expect(screen.getByText('Altere a filtragem ou adicione novos dados.')).toBeInTheDocument();
  });

  it('renders the single action', () => {
    const onClick = vi.fn();
    render(
      <DefaultEmptyData
        action={
          <button type="button" onClick={onClick}>
            Agir
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Agir' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
