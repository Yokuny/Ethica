// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Panel, PanelGroup } from './panel.js';
import { ProductSpecs } from './product-specs.js';

function Groups() {
  return (
    <PanelGroup>
      <Panel title="Informações">
        <ProductSpecs specs={[{ label: 'SKU', value: 'ABC-1', description: 'Código' }]} />
      </Panel>
      <Panel title="Histórico" empty>
        <p>Sem dados</p>
      </Panel>
    </PanelGroup>
  );
}

describe('PanelGroup and Panel (AD-312)', () => {
  afterEach(() => cleanup());

  it('starts every block collapsed (AD-172) and pairs each label with its value once opened', async () => {
    const user = userEvent.setup();
    render(<Groups />);
    expect(screen.getByText('ABC-1')).not.toBeVisible();
    expect(screen.getByText('Sem dados')).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Informações' }));
    const row = within(screen.getByRole('region', { name: 'Informações' })).getByRole('row');
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['SKUCódigo', 'ABC-1']);
    expect(screen.getByText('Sem dados')).not.toBeVisible();
  });

  it('opens all with "Expandir tudo" and closes all with "Recolher tudo"', async () => {
    const user = userEvent.setup();
    render(<Groups />);

    await user.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    expect(screen.getByText('ABC-1')).toBeVisible();
    expect(screen.getByText('Sem dados')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Recolher tudo' }));
    expect(screen.getByText('ABC-1')).not.toBeVisible();
    expect(screen.getByText('Sem dados')).not.toBeVisible();
  });

  it('marks an empty block "Não preenchido" and leaves out "Expandir tudo" for a single block', () => {
    render(
      <PanelGroup>
        <Panel title="Prazos" empty />
      </PanelGroup>,
    );
    expect(screen.getByRole('button', { name: /Prazos/ })).toHaveTextContent('Não preenchido');
    expect(screen.queryByRole('button', { name: 'Expandir tudo' })).not.toBeInTheDocument();
  });
});
