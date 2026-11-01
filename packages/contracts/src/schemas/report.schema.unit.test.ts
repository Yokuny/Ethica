import { describe, expect, it } from 'vitest';
import { createReportSchema, numberSections, pendingVariables, reportRoleType } from './report.schema.js';

describe('numberSections', () => {
  it('numera pela posição e pelo nível e reinicia o subnível', () => {
    expect(numberSections([{ level: 1 }, { level: 2 }, { level: 2 }, { level: 1 }, { level: 2 }])).toEqual([
      '1',
      '1.1',
      '1.2',
      '2',
      '2.1',
    ]);
  });

  it('trata o salto de nível como o seguinte do anterior', () => {
    expect(numberSections([{ level: 3 }, { level: 1 }, { level: 3 }])).toEqual(['1', '2', '2.1']);
  });
});

describe('pendingVariables', () => {
  it('acha só os marcadores da lista', () => {
    expect(pendingVariables('<p>[VARA] e [NUMERO_PROCESSO] e [OUTRO]</p>')).toEqual(['[NUMERO_PROCESSO]', '[VARA]']);
  });
});

describe('report', () => {
  it('assistente técnico emite parecer técnico', () => {
    expect(reportRoleType('technical_assistant')).toBe('technical_opinion');
    expect(reportRoleType('court_expert')).toBe('report');
  });

  it('aceita o modelo padrão e exige uma seção', () => {
    const base = { caseId: '6560a0a0a0a0a0a0a0a0a0a0', templateId: 'standard-report' };
    expect(createReportSchema.safeParse({ ...base, sections: [{ id: 'std-1', variant: 'yes' }] }).success).toBe(true);
    expect(createReportSchema.safeParse({ ...base, sections: [] }).success).toBe(false);
    expect(
      createReportSchema.safeParse({ ...base, templateId: 'qualquer', sections: [{ id: 'a', variant: 'no' }] }).success,
    ).toBe(false);
  });
});
