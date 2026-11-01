import { describe, expect, it } from 'vitest';
import { INSPECTION_EMPTY_DATA, inspectionDataSchema, saveInspectionSchema } from './inspection.schema.js';
import { REPORT_IMG_SRC } from './report.schema.js';

describe('vistoriaDadosSchema (AD-130)', () => {
  it('aceita o formulário completo e recusa chave desconhecida', () => {
    const data = {
      attendees: [{ id: 'p1', name: 'Maria', capacity: 'plaintiff', email: 'maria@x.com' }],
      comparators: [{ id: 'g1', side: 'defendant', name: 'João', job: 'Soldador', workedTogether: true }],
      jobs: [
        {
          id: 'f1',
          title: 'Soldador',
          yearStart: 2019,
          plaintiff: { activities: 'Solda MIG', timeExposure: '8h/dia' },
          defendant: { activities: 'Solda eventual' },
        },
      ],
      agents: [{ agent: 'noise', present: 'yes', ppe: 'Protetor auricular' }],
      documents: [{ id: 'd1', document: 'ltcat', requested: true }],
      notes: 'internal',
    };
    expect(inspectionDataSchema.safeParse(data).success).toBe(true);
    expect(inspectionDataSchema.safeParse({ ...data, witnesses: [] }).success).toBe(false);
    expect(inspectionDataSchema.safeParse({ ...data, agents: [{ agent: 'ruido', present: 'yes' }] }).success).toBe(
      false,
    );
  });

  it('salvar exige a versão conhecida pelo aparelho', () => {
    expect(saveInspectionSchema.safeParse({ version: 0, data: INSPECTION_EMPTY_DATA }).success).toBe(true);
    expect(saveInspectionSchema.safeParse({ data: INSPECTION_EMPTY_DATA }).success).toBe(false);
  });
});

describe('LAUDO_IMG_SRC (AD-129)', () => {
  it('só aceita o caminho da mídia de vistoria', () => {
    expect(
      REPORT_IMG_SRC.test('/inspections/6560a0a0a0a0a0a0a0a0a0a0/media/0f8fad5b-d9cb-469f-a165-70867728950e'),
    ).toBe(true);
    expect(REPORT_IMG_SRC.test('https://x.com/a.png')).toBe(false);
    expect(REPORT_IMG_SRC.test('/tenant/office/logo')).toBe(false);
  });
});
