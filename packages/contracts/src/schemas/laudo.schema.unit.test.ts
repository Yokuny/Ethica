import { describe, expect, it } from 'vitest';
import { createLaudoSchema, numerarSecoes, pendingVariables, reportRoleType } from './laudo.schema.js';

describe('numerarSecoes', () => {
  it('numera pela posição e pelo nível e reinicia o subnível', () => {
    expect(numerarSecoes([{ nivel: 1 }, { nivel: 2 }, { nivel: 2 }, { nivel: 1 }, { nivel: 2 }])).toEqual([
      '1',
      '1.1',
      '1.2',
      '2',
      '2.1',
    ]);
  });

  it('trata o salto de nível como o seguinte do anterior', () => {
    expect(numerarSecoes([{ nivel: 3 }, { nivel: 1 }, { nivel: 3 }])).toEqual(['1', '2', '2.1']);
  });
});

describe('pendingVariables', () => {
  it('acha só os marcadores da lista', () => {
    expect(pendingVariables('<p>[VARA] e [NUMERO_PROCESSO] e [OUTRO]</p>')).toEqual(['[NUMERO_PROCESSO]', '[VARA]']);
  });
});

describe('laudo', () => {
  it('assistente técnico emite parecer técnico', () => {
    expect(reportRoleType('technical_assistant')).toBe('technical_opinion');
    expect(reportRoleType('court_expert')).toBe('report');
  });

  it('aceita o modelo padrão e exige uma seção', () => {
    const base = { caseId: '6560a0a0a0a0a0a0a0a0a0a0', modeloId: 'standard-report' };
    expect(createLaudoSchema.safeParse({ ...base, secoes: [{ id: 'std-1', variante: 'yes' }] }).success).toBe(true);
    expect(createLaudoSchema.safeParse({ ...base, secoes: [] }).success).toBe(false);
    expect(
      createLaudoSchema.safeParse({ ...base, modeloId: 'qualquer', secoes: [{ id: 'a', variante: 'no' }] }).success,
    ).toBe(false);
  });
});
