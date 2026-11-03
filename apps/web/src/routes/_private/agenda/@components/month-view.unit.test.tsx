// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';
import { MonthView } from './month-view.js';

const entry = (id: string, date: string, extra: Partial<CalendarEntryRecord> = {}): CalendarEntryRecord => ({
  id,
  source: 'deadline',
  originId: `d-${id}`,
  type: 'deadline',
  caseId: 'p1',
  caseNumber: '0001234-56.2026.5.02.0001',
  title: `Prazo ${id}`,
  date,
  status: 'open',
  ...extra,
});

// PRZ-01.6, AEV-03: the calendar shows the all-day entries on their day.
describe('MonthView com itens de dia inteiro', () => {
  afterEach(cleanup);

  it('mostra cada item no seu dia e abre o item ao clicar', () => {
    const onSelectEntry = vi.fn();
    render(
      <MonthView
        month="2026-11-15"
        items={[]}
        onSelect={vi.fn()}
        entries={[entry('a', '2026-11-10'), entry('b', '2026-11-20')]}
        onSelectEntry={onSelectEntry}
        today="2026-11-15"
      />,
    );

    const dia10 = screen.getByTestId('month-view-day-2026-11-10');
    expect(within(dia10).getByText(/Prazo a/)).toBeInTheDocument();
    expect(within(dia10).queryByText(/Prazo b/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('month-view-day-2026-11-20')).getByText(/Prazo b/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('calendar-entry-b'));
    expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('aberto antes de hoje ganha o destaque de erro; pago fica no dia marcado como pago', () => {
    render(
      <MonthView
        month="2026-11-15"
        items={[]}
        onSelect={vi.fn()}
        entries={[
          entry('a', '2026-11-10'),
          entry('b', '2026-11-05', {
            source: 'transaction',
            type: 'income',
            title: 'Honorários',
            amountCents: 100_000,
            status: 'done',
          }),
        ]}
        today="2026-11-15"
      />,
    );
    expect(screen.getByTestId('calendar-entry-a')).toHaveClass('text-destructive');
    expect(screen.getByTestId('calendar-entry-b')).not.toHaveClass('text-destructive');
    expect(screen.getByTestId('calendar-entry-b')).toHaveTextContent(/Honorários.*Pago/);
  });
});
