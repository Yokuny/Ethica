// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportTable } from '@/lib/helpers/tableExport.helper.js';
import { DataTable } from './data-table.js';

vi.mock('@/lib/helpers/tableExport.helper.js', () => ({ exportTable: vi.fn() }));

type Row = { name: string };
const columns = [{ header: 'Nome', value: (row: Row) => row.name }];

describe('DataTable — exportar', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(exportTable).mockClear();
  });

  it('baixa as linhas em tela no formato escolhido', async () => {
    render(<DataTable export={{ title: 'Partes', columns, rows: [{ name: 'Ana' }] }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportar dados' }));
    expect(screen.queryByText('Todos os filtrados')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'CSV' }));
    await waitFor(() => expect(exportTable).toHaveBeenCalledWith('csv', 'Partes', columns, [{ name: 'Ana' }]));
  });

  it('em "Todos os filtrados" lê todas as páginas dos filtros', async () => {
    const fetchPage = vi.fn(async (page: number) => ({ items: [{ name: `p${page}` }], total: 2 }));
    render(<DataTable export={{ title: 'Partes', columns, rows: [{ name: 'p1' }], fetchPage }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportar dados' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Todos os filtrados' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excel' }));
    await waitFor(() =>
      expect(exportTable).toHaveBeenCalledWith('xlsx', 'Partes', columns, [{ name: 'p1' }, { name: 'p2' }]),
    );
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenCalledWith(1, 100);
  });

  it('fica desabilitado sem linhas', () => {
    render(<DataTable export={{ title: 'Partes', columns, rows: [] }} />);
    expect(screen.getByRole('button', { name: 'Exportar dados' })).toBeDisabled();
  });
});
