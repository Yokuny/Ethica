// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFile } from '@/lib/api/client.api.js';
import { PdfPreviewDialog } from './pdf-preview-dialog.js';

vi.mock('@/lib/api/client.api.js', () => ({ getFile: vi.fn() }));

const renderDialog = () =>
  render(
    <PdfPreviewDialog path="/documents/stalled" onClose={() => undefined}>
      <button type="button">Gerar PDF</button>
    </PdfPreviewDialog>,
  );

describe('PdfPreviewDialog', () => {
  afterEach(cleanup);

  it('mostra o PDF na tela, com o download abaixo', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:pdf');
    URL.revokeObjectURL = vi.fn();
    vi.mocked(getFile).mockResolvedValue({ success: true, blob: new Blob(['%PDF']), filename: 'a.pdf' });
    renderDialog();
    expect(await screen.findByTitle('Visualizar PDF')).toHaveAttribute('src', 'blob:pdf');
    expect(getFile).toHaveBeenCalledWith('/documents/stalled');
    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeInTheDocument();
  });

  it('avisa quando o PDF não pode ser gerado', async () => {
    vi.mocked(getFile).mockResolvedValue({ success: false, message: 'Não foi possível gerar.' });
    renderDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gerar.');
  });
});
