// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { INSPECTION_EMPTY_DATA, type InspectionData } from '@ethica/contracts';
import { cleanup, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type StateSync, useStateSync } from '@/lib/offline/sync.js';
import { SignaturesPanel } from './signatures-panel.js';

vi.mock('@/lib/offline/sync.js', () => ({ useStateSync: vi.fn() }));

const SYNC: StateSync = { online: true, syncing: false, pending: 0, conflicts: 0, failures: 0 };
const DATA: InspectionData = {
  ...INSPECTION_EMPTY_DATA,
  attendees: [
    { id: 'a', name: 'Ana', capacity: 'plaintiff', signatureId: crypto.randomUUID() },
    { id: 'b', name: 'Bruno', capacity: 'witness' },
  ],
};

function Panel() {
  const form = useForm<InspectionData>({ defaultValues: DATA });
  return <SignaturesPanel form={form} appointmentId="1" onSignature={async () => 'x'} />;
}

describe('SignaturesPanel', () => {
  afterEach(cleanup);

  it('lista todos os presentes com a assinatura e libera o PDF com tudo enviado', () => {
    vi.mocked(useStateSync).mockReturnValue(SYNC);
    render(<Panel />);
    expect(screen.getByText('Assinado')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Colher assinatura' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Visualizar PDF' })).toBeEnabled();
  });

  it('trava o PDF sem conexão ou com algo ainda no aparelho, com o motivo', () => {
    vi.mocked(useStateSync).mockReturnValue({ ...SYNC, online: false });
    render(<Panel />);
    expect(screen.getByRole('button', { name: 'Visualizar PDF' })).toBeDisabled();
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
    cleanup();
    vi.mocked(useStateSync).mockReturnValue({ ...SYNC, pending: 1 });
    render(<Panel />);
    expect(screen.getByRole('button', { name: 'Visualizar PDF' })).toBeDisabled();
  });
});
