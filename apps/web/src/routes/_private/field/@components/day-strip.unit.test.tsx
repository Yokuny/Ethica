// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DayStrip } from './day-strip.js';

describe('DayStrip', () => {
  afterEach(cleanup);

  it('um clique escolhe o dia; o clique seguinte em outro dia fecha o intervalo, em qualquer ordem', () => {
    const onChange = vi.fn();
    render(<DayStrip from="2026-11-20" to="2026-11-20" onChange={onChange} />);
    expect(screen.getByRole('button', { name: '20 nov 2026' })).toHaveTextContent('nov20sex');
    fireEvent.click(screen.getByRole('button', { name: '24 nov 2026' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-24', to: '2026-11-24' });
    fireEvent.click(screen.getByRole('button', { name: '21 nov 2026' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-21', to: '2026-11-24' });
    fireEvent.click(screen.getByRole('button', { name: '22 nov 2026' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-22', to: '2026-11-22' });
  });

  it('as setas andam os dias visíveis sem mudar a seleção', () => {
    const onChange = vi.fn();
    render(<DayStrip from="2026-11-20" to="2026-11-20" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('button', { name: '11 dez 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '20 nov 2026' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
