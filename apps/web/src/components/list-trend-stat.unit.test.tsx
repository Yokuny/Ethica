// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ListTrendStat } from './list-trend-stat.js';

describe('ListTrendStat', () => {
  afterEach(() => cleanup());

  it('mostra a direção numérica com cor consistente e os valores da comparação', async () => {
    const user = userEvent.setup();
    render(
      <ListTrendStat
        label="Perdido"
        value="2"
        event="Processos perdidos"
        average
        trend={{
          series: Array(30).fill(0),
          direction: 'down',
          changePercent: -50,
          comparison: { current: 2, previous: 4, delta: -2 },
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Tendência de queda' })).toHaveClass('text-destructive');
    const help = screen.getByRole('button', { name: /Hoje: 2\. Média diária anterior: 4\. Perda: 50%/ });
    await user.hover(help);
    expect(await screen.findByText('Processos perdidos')).toBeVisible();
    expect(screen.getByText('Perda')).toBeVisible();
    expect(screen.getByText('50%')).toBeVisible();
  });

  it('explica o delta absoluto quando não há percentual calculável', () => {
    render(
      <ListTrendStat
        label="Pedidos"
        value="3"
        event="Pedidos criados"
        trend={{
          series: Array(30).fill(0),
          direction: 'up',
          changePercent: null,
          comparison: { current: 3, previous: 0, delta: 3 },
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Tendência de alta' })).toHaveClass('text-status-success-foreground');
    expect(
      screen.getByRole('button', { name: /Últimos 30 dias: 3\. 30 dias anteriores: 0\. Delta: \+3/ }),
    ).toBeVisible();
  });
});
