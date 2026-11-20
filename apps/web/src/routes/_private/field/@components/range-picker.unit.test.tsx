// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RangePicker } from './range-picker.js';

describe('RangePicker', () => {
  afterEach(cleanup);

  it('o primeiro clique é o início e o segundo o fim, em qualquer ordem', async () => {
    const onChange = vi.fn();
    render(<RangePicker from="2026-11-10" to="2026-11-10" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Intervalo de datas' }));
    const day = async (n: string) =>
      (await screen.findAllByRole('button', { name: new RegExp(`\\b${n}\\b.*novembro`, 'i') }))[0] as HTMLElement;
    fireEvent.click(await day('20'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(await day('14'));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-11-14', to: '2026-11-20' });
  });

  it('Semana e Mês escolhem a semana (segunda a domingo) e o mês do dia selecionado', async () => {
    const onChange = vi.fn();
    render(<RangePicker from="2026-11-20" to="2026-11-20" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Intervalo de datas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Semana' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-16', to: '2026-11-22' });
    fireEvent.click(screen.getByRole('button', { name: 'Intervalo de datas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mês' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-11-01', to: '2026-11-30' });
  });
});
