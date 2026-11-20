// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RangeNav } from './range-nav.js';

describe('RangeNav', () => {
  afterEach(cleanup);

  it('anterior e próximo andam o tamanho do intervalo; Hoje limpa o intervalo', () => {
    const onChange = vi.fn();
    render(<RangeNav from="2026-11-10" to="2026-11-12" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-13', to: '2026-11-15' });
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-07', to: '2026-11-09' });
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: undefined, to: undefined });
  });

  it('no calendário, o primeiro clique é o início e o segundo o fim, em qualquer ordem', async () => {
    const onChange = vi.fn();
    render(<RangeNav from="2026-11-10" to="2026-11-10" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Intervalo de datas' }));
    const day = async (n: string) =>
      (await screen.findAllByRole('button', { name: new RegExp(`\\b${n}\\b.*novembro`, 'i') }))[0] as HTMLElement;
    fireEvent.click(await day('20'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(await day('14'));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-11-14', to: '2026-11-20' });
  });
});
