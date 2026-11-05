import { describe, expect, it } from 'vitest';
import { deadlineAlert, deadlineSuggestions } from './deadline-labels.js';

// Criticality (AD-190): overdue before today; urgent up to 5 days, due soon up to 10, attention up to 30.
describe('deadlineAlert', () => {
  const today = '2026-11-10';

  it('atrasado, urgente, vence em breve, atenção e sem selo depois de 30 dias', () => {
    const alert = (dueDate: string) => deadlineAlert({ dueDate, status: 'pending' }, today);
    expect(alert('2026-11-09')).toBe('deadline_overdue');
    expect(alert('2026-11-10')).toBe('deadline_urgent');
    expect(alert('2026-11-15')).toBe('deadline_urgent');
    expect(alert('2026-11-16')).toBe('due_soon');
    expect(alert('2026-11-20')).toBe('due_soon');
    expect(alert('2026-11-21')).toBe('deadline_attention');
    expect(alert('2026-12-10')).toBe('deadline_attention');
    expect(alert('2026-12-11')).toBeUndefined();
  });

  it('protocolado, perdido e concluído nunca alertam, mesmo vencidos', () => {
    expect(deadlineAlert({ dueDate: '2026-11-01', status: 'filed' }, today)).toBeUndefined();
    expect(deadlineAlert({ dueDate: '2026-11-01', status: 'done' }, today)).toBeUndefined();
    expect(deadlineAlert({ dueDate: '2026-11-01', status: 'missed' }, today)).toBeUndefined();
  });

  it('sem status (próximo prazo da listagem, sempre pendente) alerta pelo vencimento', () => {
    expect(deadlineAlert({ dueDate: '2026-11-01' }, today)).toBe('deadline_overdue');
  });
});

// Approved titles by service type (AD-190).
describe('deadlineSuggestions', () => {
  it('perícia, assistência e Parceria têm prazos e alertas; outro tipo do escritório só escreve à mão', () => {
    const [deadlines, alerts] = deadlineSuggestions({ role: 'court_expert' });
    expect(deadlines).toMatchObject({ kind: 'deadline' });
    expect(deadlines?.titles).toContain('Entrega do laudo');
    expect(alerts).toMatchObject({ kind: 'alert' });
    expect(alerts?.titles).toContain('Agendar a perícia');
    expect(deadlineSuggestions({ role: 'technical_assistant' })[0]?.titles).toContain('Parecer técnico');
    expect(deadlineSuggestions({ role: 'other', serviceType: 'Parceria' })[0]?.titles).toEqual([
      'Entrega do serviço',
      'Entrega de revisão',
    ]);
    expect(deadlineSuggestions({ role: 'other', serviceType: 'Avaliação de imóvel' })).toEqual([]);
  });
});
