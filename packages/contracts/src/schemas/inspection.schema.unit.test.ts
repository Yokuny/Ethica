import { describe, expect, it } from 'vitest';
import { INSPECTION_EMPTY_DATA, inspectionDataSchema, saveInspectionSchema } from './inspection.schema.js';
import { LAUDO_IMG_SRC } from './laudo.schema.js';

describe('vistoriaDadosSchema (AD-130)', () => {
  it('aceita o formulário completo e recusa chave desconhecida', () => {
    const dados = {
      attendees: [{ id: 'p1', nome: 'Maria', capacity: 'plaintiff', email: 'maria@x.com' }],
      comparators: [{ id: 'g1', side: 'defendant', nome: 'João', job: 'Soldador', workedTogether: true }],
      jobs: [
        {
          id: 'f1',
          titulo: 'Soldador',
          yearStart: 2019,
          plaintiff: { atividades: 'Solda MIG', timeExposure: '8h/dia' },
          defendant: { atividades: 'Solda eventual' },
        },
      ],
      agents: [{ agent: 'noise', present: 'yes', ppe: 'Protetor auricular' }],
      documentos: [{ id: 'd1', documento: 'ltcat', requested: true }],
      observacoes: 'internal',
    };
    expect(inspectionDataSchema.safeParse(dados).success).toBe(true);
    expect(inspectionDataSchema.safeParse({ ...dados, witnesses: [] }).success).toBe(false);
    expect(inspectionDataSchema.safeParse({ ...dados, agents: [{ agent: 'ruido', present: 'yes' }] }).success).toBe(
      false,
    );
  });

  it('salvar exige a versão conhecida pelo aparelho', () => {
    expect(saveInspectionSchema.safeParse({ versao: 0, dados: INSPECTION_EMPTY_DATA }).success).toBe(true);
    expect(saveInspectionSchema.safeParse({ dados: INSPECTION_EMPTY_DATA }).success).toBe(false);
  });
});

describe('LAUDO_IMG_SRC (AD-129)', () => {
  it('só aceita o caminho da mídia de vistoria', () => {
    expect(LAUDO_IMG_SRC.test('/inspections/6560a0a0a0a0a0a0a0a0a0a0/media/0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(
      true,
    );
    expect(LAUDO_IMG_SRC.test('https://x.com/a.png')).toBe(false);
    expect(LAUDO_IMG_SRC.test('/tenant/office/logo')).toBe(false);
  });
});
