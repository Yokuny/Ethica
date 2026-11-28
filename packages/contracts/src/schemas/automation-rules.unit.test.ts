import { describe, expect, it } from 'vitest';
import { CASE_FINISHED_RULE, courtFinishing, matchRules, proposalFits } from './automation-rules.js';

const movement = (code: number) => ({ key: 'k', code, name: 'x', at: '2026-11-20T10:00:00Z', complements: [] });
const perito = {
  serviceType: 'expert_examination' as const,
  status: 'active' as const,
  phase: 'drafting_report' as const,
};

describe('regras da Automação Datajud (AD-268)', () => {
  it('reconhece suspensão, retomada, acordo por papel, desistência e sentença', () => {
    expect(matchRules(movement(272), 'expert_examination')[0]?.proposal).toEqual({
      target: 'case_status',
      value: 'suspended',
    });
    expect(matchRules(movement(12066), 'expert_examination')[0]?.proposal).toEqual({
      target: 'case_status',
      value: 'active',
    });
    expect(matchRules(movement(466), 'technical_assistance')[0]?.proposal).toEqual({
      target: 'case_phase',
      value: 'assistance_settlement',
    });
    expect(matchRules(movement(463), 'expert_examination')[0]?.rule.key).toBe('case_withdrawal');
    expect(matchRules(movement(463), 'technical_assistance')).toEqual([]);
    expect(matchRules(movement(219), 'expert_examination')[0]?.proposal).toEqual({
      target: 'case_phase',
      value: 'evidence_closed',
    });
    // The lifting of the suspension (children of 14974 in the TPU) resumes, never suspends.
    for (const code of [14975, 14984, 14985]) {
      expect(matchRules(movement(code), 'expert_examination').map((match) => match.proposal)).toEqual([
        { target: 'case_status', value: 'active' },
      ]);
    }
    // Alvará, payment and other movements are not service suggestions (Fase 6).
    expect(matchRules(movement(60), 'expert_examination')).toEqual([]);
  });

  it('a sugestão só cabe se avança a fase, não está no estado proposto e o serviço não está encerrado', () => {
    expect(proposalFits(perito, { target: 'case_phase', value: 'evidence_closed' })).toBe('apply');
    expect(
      proposalFits({ ...perito, phase: 'evidence_closed' }, { target: 'case_phase', value: 'evidence_closed' }),
    ).toBe('already');
    expect(
      proposalFits({ ...perito, phase: 'fees_received' }, { target: 'case_phase', value: 'evidence_closed' }),
    ).toBe('impossible');
    // Back to an earlier phase: never.
    expect(
      proposalFits({ ...perito, phase: 'awaiting_judge' }, { target: 'case_phase', value: 'drafting_report' }),
    ).toBe('impossible');
    // A loss phase closes the case from any open phase.
    expect(proposalFits({ ...perito, phase: 'awaiting_judge' }, { target: 'case_phase', value: 'settlement' })).toBe(
      'apply',
    );
    expect(proposalFits(perito, { target: 'case_phase', value: 'assistance_settlement' })).toBe('impossible');
    expect(proposalFits(perito, { target: 'case_status', value: 'suspended' })).toBe('apply');
    expect(proposalFits({ ...perito, status: 'suspended' }, { target: 'case_status', value: 'suspended' })).toBe(
      'already',
    );
  });
});

describe('regras completas pela TPU e fim do processo (SGD-04, AD-309)', () => {
  const at = (code: number, day: string) => ({ ...movement(code), key: `${code}-${day}`, at: `${day}T10:00:00Z` });

  it('suspende pelas famílias 25, 11025 e 12274 e pelo arquivamento provisório; retoma pela reativação e pelo desarquivamento', () => {
    for (const code of [15248, 11012, 12274, 245]) {
      expect(matchRules(movement(code), 'expert_examination')[0]?.rule.key).toBe('case_suspended');
    }
    for (const code of [14974, 15416, 849, 893]) {
      expect(matchRules(movement(code), 'expert_examination')[0]?.rule.key).toBe('case_resumed');
    }
  });

  it('o processo encerra pelo último movimento entre encerrar e retomar', () => {
    // TRF3: baixa em 2011, reativação, baixa de novo em 2023.
    expect(
      courtFinishing([{ degree: 'G1', movements: [at(22, '2011-08-30'), at(849, '2011-09-01'), at(22, '2023-12-19')] }])
        ?.at,
    ).toBe('2023-12-19T10:00:00Z');
    expect(courtFinishing([{ degree: 'G1', movements: [at(246, '2020-01-01'), at(893, '2021-01-01')] }])).toBe(
      undefined,
    );
    // TRT24: extinção da execução, arquivamento e só depois a RPV paga (não é de encerrar nem retomar).
    expect(
      courtFinishing([
        { degree: 'G1', movements: [at(196, '2026-06-09'), at(246, '2026-06-11'), at(12176, '2026-06-12')] },
      ])?.code,
    ).toBe(246);
    // A baixa no segundo grau é o recurso voltando à origem.
    expect(courtFinishing([{ degree: 'G2', movements: [at(22, '2024-01-01')] }])).toBe(undefined);
  });

  it('encerrar sugere Honorários recebidos na perícia e Finalizado na assistência técnica', () => {
    expect(CASE_FINISHED_RULE.propose('expert_examination')).toEqual({ target: 'case_phase', value: 'fees_received' });
    expect(CASE_FINISHED_RULE.propose('technical_assistance')).toEqual({ target: 'case_phase', value: 'finished' });
    expect(CASE_FINISHED_RULE.propose('partnership')).toBe(undefined);
  });
});
