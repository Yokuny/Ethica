import { describe, expect, it } from 'vitest';
import { deadlineAlert } from './deadline-labels.js';

// PRZ-01.5: "vence em breve" = até 15 dias (usuário, 2026-10-31); vencido = antes de hoje.
describe('deadlineAlert', () => {
  const today = '2026-11-10';

  it('pendente antes de hoje é vencido; hoje e até 15 dias vencem em breve; 16 dias não alerta', () => {
    expect(deadlineAlert({ vencimento: '2026-11-09', status: 'pending' }, today)).toBe('deadline_overdue');
    expect(deadlineAlert({ vencimento: '2026-11-10', status: 'pending' }, today)).toBe('due_soon');
    expect(deadlineAlert({ vencimento: '2026-11-25', status: 'pending' }, today)).toBe('due_soon');
    expect(deadlineAlert({ vencimento: '2026-11-26', status: 'pending' }, today)).toBeUndefined();
  });

  it('protocolado e perdido nunca alertam, mesmo vencidos', () => {
    expect(deadlineAlert({ vencimento: '2026-11-01', status: 'filed' }, today)).toBeUndefined();
    expect(deadlineAlert({ vencimento: '2026-11-01', status: 'missed' }, today)).toBeUndefined();
  });

  it('sem status (próximo prazo da listagem, sempre pendente) alerta pelo vencimento', () => {
    expect(deadlineAlert({ vencimento: '2026-11-01' }, today)).toBe('deadline_overdue');
  });
});
