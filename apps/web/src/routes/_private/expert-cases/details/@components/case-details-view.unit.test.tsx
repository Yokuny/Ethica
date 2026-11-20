// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { CaseRecord } from '@/query/case.js';
import { CaseDetailsView } from './case-details-view.js';

// Office's own type with only the contractor's name: the other contractor fields and the notes are empty.
const legalCase = {
  id: 'c1',
  serviceType: 'Parceria',
  role: 'court_expert',
  subject: 'Vistoria de imóvel urbano',
  contractor: { name: 'Mestre' },
  parties: [],
  phase: 'custom',
  phaseName: 'Contratado',
  status: 'active',
  movements: [],
  attachments: [],
} as unknown as CaseRecord;

describe('CaseDetailsView — not filled last (AD-238)', () => {
  afterEach(() => cleanup());

  it('keeps the empty fields in their group, after the filled ones, marked "Não preenchido"', async () => {
    const user = userEvent.setup();
    render(<CaseDetailsView legalCase={legalCase} canSeeFinance={false} />);

    await user.click(screen.getByRole('button', { name: 'Dados do contratante' }));
    const rows = within(screen.getByRole('region', { name: 'Dados do contratante' })).getAllByRole('row');
    const labels = rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent);
    expect(labels.indexOf('Nome / razão social')).toBeLessThan(labels.indexOf('CPF/CNPJ'));
    expect(within(rows.at(-1) as HTMLElement).getByText('Não preenchido')).toBeInTheDocument();
  });

  it('turns a group with nothing filled into an empty block marked "Não preenchido"', () => {
    render(<CaseDetailsView legalCase={legalCase} canSeeFinance={false} />);

    const notes = screen.getByRole('region', { name: 'Observações' });
    expect(notes).toHaveClass('order-last');
    expect(within(notes).getByText('Não preenchido')).toBeInTheDocument();
  });
});
