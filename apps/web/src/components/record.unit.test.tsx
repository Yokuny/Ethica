// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from './record.js';

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
