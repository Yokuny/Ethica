import { describe, expect, it } from 'vitest';
import { alertaDoPrazo } from './prazo-labels.js';

// PRZ-01.5: "vence em breve" = até 15 dias (usuário, 2026-10-31); vencido = antes de hoje.
describe('alertaDoPrazo', () => {
  const today = '2026-11-10';

  it('pendente antes de hoje é vencido; hoje e até 15 dias vencem em breve; 16 dias não alerta', () => {
    expect(alertaDoPrazo({ vencimento: '2026-11-09', status: 'pendente' }, today)).toBe('deadline_overdue');
    expect(alertaDoPrazo({ vencimento: '2026-11-10', status: 'pendente' }, today)).toBe('due_soon');
    expect(alertaDoPrazo({ vencimento: '2026-11-25', status: 'pendente' }, today)).toBe('due_soon');
    expect(alertaDoPrazo({ vencimento: '2026-11-26', status: 'pendente' }, today)).toBeUndefined();
  });

  it('protocolado e perdido nunca alertam, mesmo vencidos', () => {
    expect(alertaDoPrazo({ vencimento: '2026-11-01', status: 'protocolado' }, today)).toBeUndefined();
    expect(alertaDoPrazo({ vencimento: '2026-11-01', status: 'perdido' }, today)).toBeUndefined();
  });

  it('sem status (próximo prazo da listagem, sempre pendente) alerta pelo vencimento', () => {
    expect(alertaDoPrazo({ vencimento: '2026-11-01' }, today)).toBe('deadline_overdue');
  });
});
