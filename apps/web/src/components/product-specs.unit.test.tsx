// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductSpecs } from './product-specs.js';

const groups = [
  { id: 'info', name: 'Informações', specs: [{ label: 'SKU', value: 'ABC-1', description: 'Código' }] },
  { id: 'empty', name: 'Histórico', children: <p>Sem dados</p> },
];

describe('ProductSpecs (AD-091)', () => {
  afterEach(() => cleanup());

  it('opens every group by default and pairs each label with its value', () => {
    render(<ProductSpecs groups={groups} />);

    const row = within(screen.getByRole('region', { name: 'Informações' })).getByRole('row');
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['SKUCódigo', 'ABC-1']);
    expect(within(screen.getByRole('region', { name: 'Histórico' })).getByText('Sem dados')).toBeVisible();
  });

  it('collapses one group on its trigger and all of them with "Recolher tudo"', async () => {
    const user = userEvent.setup();
    render(<ProductSpecs groups={groups} />);

    await user.click(screen.getByRole('button', { name: 'Informações' }));
    expect(screen.queryByText('ABC-1')).not.toBeInTheDocument();
    expect(screen.getByText('Sem dados')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    expect(screen.getByText('ABC-1')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Recolher tudo' }));
    expect(screen.queryByText('ABC-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Sem dados')).not.toBeInTheDocument();
  });
});
