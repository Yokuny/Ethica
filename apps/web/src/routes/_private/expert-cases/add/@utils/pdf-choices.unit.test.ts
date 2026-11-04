import { describe, expect, it } from 'vitest';
import { chosenDraft, fieldOptions, initialChoices, type ReadPdf, uniqueParties } from './pdf-choices.js';

const PDFS: ReadPdf[] = [
  {
    name: 'parte 1.pdf',
    draft: {
      role: 'court_expert',
      processNumber: '0001234-56.2026.5.02.0001',
      courtType: 'labor',
      court: 'TRT2',
      parties: [{ side: 'plaintiff', type: 'party', name: 'João da Silva' }],
    },
  },
  {
    name: 'parte 2.pdf',
    draft: {
      processNumber: '0001234-56.2026.5.02.0001',
      courtType: 'civil',
      court: 'TJSP',
      subject: 'Insalubridade',
      parties: [
        { side: 'plaintiff', type: 'party', name: 'JOAO  DA SILVA' },
        { side: 'defendant', type: 'party', name: 'Empresa Ltda' },
      ],
    },
  },
];

describe('pdf-choices (AD-183)', () => {
  it('lista cada valor diferente uma vez, com o primeiro arquivo que o trouxe', () => {
    expect(fieldOptions(PDFS, 'processNumber')).toEqual([
      { index: 0, value: '0001234-56.2026.5.02.0001', file: 'parte 1.pdf' },
    ]);
    expect(fieldOptions(PDFS, 'court').map((option) => option.value)).toEqual(['TRT2', 'TJSP']);
    expect(fieldOptions(PDFS, 'division')).toEqual([]);
  });

  it('junta as partes sem repetir o mesmo nome no mesmo polo', () => {
    expect(uniqueParties(PDFS).map((party) => party.name)).toEqual(['João da Silva', 'Empresa Ltda']);
  });

  it('começa pelo primeiro arquivo e monta o rascunho com o que foi escolhido', () => {
    const choices = initialChoices(PDFS);
    expect(choices).toEqual({ processNumber: 0, court: 0, subject: 1 });

    const draft = chosenDraft(
      PDFS,
      { ...choices, court: 1, subject: undefined },
      new Set(['defendant|party|empresa ltda']),
    );
    expect(draft).toEqual({
      role: 'court_expert',
      processNumber: '0001234-56.2026.5.02.0001',
      court: 'TJSP',
      courtType: 'civil',
      parties: [{ side: 'defendant', type: 'party', name: 'Empresa Ltda' }],
    });
  });
});
