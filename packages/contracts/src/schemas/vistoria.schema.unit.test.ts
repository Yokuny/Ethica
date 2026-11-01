import { describe, expect, it } from 'vitest';
import { LAUDO_IMG_SRC } from './laudo.schema.js';
import { saveVistoriaSchema, VISTORIA_DADOS_VAZIOS, vistoriaDadosSchema } from './vistoria.schema.js';

describe('vistoriaDadosSchema (AD-130)', () => {
  it('aceita o formulário completo e recusa chave desconhecida', () => {
    const dados = {
      presentes: [{ id: 'p1', nome: 'Maria', qualidade: 'plaintiff', email: 'maria@x.com' }],
      paradigmas: [{ id: 'g1', side: 'defendant', nome: 'João', funcao: 'Soldador', trabalhouJunto: true }],
      funcoes: [
        {
          id: 'f1',
          titulo: 'Soldador',
          anoInicio: 2019,
          plaintiff: { atividades: 'Solda MIG', timeExposure: '8h/dia' },
          defendant: { atividades: 'Solda eventual' },
        },
      ],
      agentes: [{ agente: 'noise', presente: 'yes', epi: 'Protetor auricular' }],
      documentos: [{ id: 'd1', documento: 'ltcat', solicitado: true }],
      observacoes: 'interno',
    };
    expect(vistoriaDadosSchema.safeParse(dados).success).toBe(true);
    expect(vistoriaDadosSchema.safeParse({ ...dados, testemunhas: [] }).success).toBe(false);
    expect(vistoriaDadosSchema.safeParse({ ...dados, agentes: [{ agente: 'ruido', presente: 'yes' }] }).success).toBe(
      false,
    );
  });

  it('salvar exige a versão conhecida pelo aparelho', () => {
    expect(saveVistoriaSchema.safeParse({ versao: 0, dados: VISTORIA_DADOS_VAZIOS }).success).toBe(true);
    expect(saveVistoriaSchema.safeParse({ dados: VISTORIA_DADOS_VAZIOS }).success).toBe(false);
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
