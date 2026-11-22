import { describe, expect, it } from 'vitest';
import { matchRules, proposalFits } from './automation-rules.js';

const movement = (code: number) => ({ key: 'k', code, name: 'x', at: '2026-11-20T10:00:00Z', complements: [] });
const perito = { role: 'court_expert' as const, status: 'active' as const, phase: 'drafting_report' as const };

describe('regras da Automação Datajud (AD-268)', () => {
  it('reconhece suspensão, retomada, acordo por papel, desistência e sentença', () => {
    expect(matchRules(movement(272), 'court_expert')[0]?.proposal).toEqual({
      target: 'case_status',
      value: 'suspended',
    });
    expect(matchRules(movement(12066), 'court_expert')[0]?.proposal).toEqual({
      target: 'case_status',
      value: 'active',
    });
    expect(matchRules(movement(466), 'technical_assistant')[0]?.proposal).toEqual({
      target: 'case_phase',
      value: 'assistance_settlement',
    });
    expect(matchRules(movement(463), 'court_expert')[0]?.rule.key).toBe('case_withdrawal');
    expect(matchRules(movement(463), 'technical_assistant')).toEqual([]);
    expect(matchRules(movement(219), 'court_expert')[0]?.proposal).toEqual({
      target: 'case_phase',
      value: 'evidence_closed',
    });
    // Alvará, payment and other movements are not service suggestions (Fase 6).
    expect(matchRules(movement(60), 'court_expert')).toEqual([]);
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
