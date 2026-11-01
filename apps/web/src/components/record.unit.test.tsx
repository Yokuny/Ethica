// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  RecordHeader,
  RecordHeading,
  RecordStat,
  RecordStats,
  RecordStatus,
  RecordTable,
  RecordTableCell,
  RecordTableMedia,
  RecordTableRow,
} from './record.js';

describe('Record (AD-072)', () => {
  afterEach(() => cleanup());

  it('renders the header pair, the status and every stat label with its value', () => {
    render(
      <>
        <RecordHeader>
          <RecordHeading label="Produto" title="Kit Viagem" />
          <RecordStatus variant="active" label="Ativo" />
        </RecordHeader>
        <RecordStats>
          <RecordStat label="SKU" value="AUR-031" />
          <RecordStat label="Estoque" value={4} description="units" />
        </RecordStats>
      </>,
    );

    expect(screen.getByRole('heading', { name: 'Kit Viagem' })).toBeVisible();
    expect(screen.getByText('Produto')).toBeVisible();
    expect(screen.getByText('Ativo')).toBeVisible();
    expect(screen.getByText('AUR-031')).toBeVisible();
    expect(screen.getByText('units')).toBeVisible();
  });

  it('rules the record strip by default and keeps the gray band for list indicators', () => {
    const { container } = render(
      <>
        <RecordStats>
          <RecordStat label="Ativo" value="Rebocador" />
        </RecordStats>
        <RecordStats variant="band">
          <RecordStat label="Clientes" value="42" />
        </RecordStats>
      </>,
    );

    const [ruled, band] = container.querySelectorAll('[data-slot="record-stats"]');
    expect(ruled).toHaveAttribute('data-variant', 'ruled');
    expect(ruled).toHaveClass('border-y');
    expect(band).toHaveAttribute('data-variant', 'band');
    expect(band).toHaveClass('bg-surface-secondary');
  });

  it('renders a free list with a heading, the row status and label-over-value cells', () => {
    render(
      <RecordTable title="Checklist" empty="Sem itens">
        <RecordTableRow
          media={
            <RecordTableMedia variant="success" label="Feito">
              ✓
            </RecordTableMedia>
          }
        >
          <RecordTableCell label="Serviço" value="Verificar cabos" />
          <RecordTableCell label="Grupo" value="Sistema elétrico" />
        </RecordTableRow>
      </RecordTable>,
    );

    const table = screen.getByRole('table', { name: 'Checklist' });
    expect(screen.getByRole('heading', { name: 'Checklist' })).toBeVisible();
    expect(within(table).getByRole('img', { name: 'Feito' })).toBeInTheDocument();
    expect(within(table).getByText('Verificar cabos')).toBeVisible();
    expect(within(table).getByText('Grupo')).toBeVisible();
  });

  it('shows the empty text when the free list has no rows', () => {
    render(<RecordTable title="Checklist" empty="Sem itens" />);

    expect(screen.getByText('Sem itens')).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders a trend line and direction beside a proportion marker', () => {
    const { container } = render(
      <RecordStats>
        <RecordStat
          label="Clientes"
          value="42"
          ratio={0.5}
          sparkline={[1, 3, 2]}
          trend="up"
          trendLabel="Tendência de alta"
        />
      </RecordStats>,
    );

    expect(screen.getByRole('img', { name: 'Tendência de alta' })).toBeVisible();
    expect(container.querySelector('svg polyline')).toHaveAttribute('points', '0,24 50,4 100,14');
    expect(container.querySelector('[style="left: 50%;"]')).toBeInTheDocument();
  });
});
