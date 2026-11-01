import { describe, expect, it, vi } from 'vitest';
import * as caseService from '../case/case.service.js';
import type { NoticeDeadline } from '../case/deadline.schema.js';
import * as deadlineService from '../case/deadline.service.js';
import * as accountService from '../identity/account.service.js';
import { proximaExecucao, sendDeadlineNotices } from './deadlineReminder.service.js';

vi.mock('../identity/account.service.js', () => ({ listDeadlineReminderRecipients: vi.fn() }));
vi.mock('../case/case.service.js', () => ({ findSummariesByIds: vi.fn() }));
vi.mock('../case/deadline.service.js', () => ({ listDeadlinesToNotice: vi.fn() }));

// 2026-11-10 07:00 em São Paulo = 10:00 UTC.
const now = new Date('2026-11-10T10:00:00.000Z');

const deadline = (id: string, tenantId: string, dueDate: string): NoticeDeadline => ({
  id,
  tenantId,
  caseId: `per-${id}`,
  titulo: `Prazo ${id}`,
  dueDate,
  status: 'pending',
  createdAt: now,
  updatedAt: now,
});

describe('proximaExecucao (07:00 de São Paulo)', () => {
  it('antes das 07:00 é hoje; às 07:00 ou depois é amanhã', () => {
    expect(proximaExecucao(new Date('2026-11-10T09:59:00.000Z'))).toEqual(new Date('2026-11-10T10:00:00.000Z'));
    expect(proximaExecucao(new Date('2026-11-10T10:00:00.000Z'))).toEqual(new Date('2026-11-11T10:00:00.000Z'));
    expect(proximaExecucao(new Date('2026-11-11T02:30:00.000Z'))).toEqual(new Date('2026-11-11T10:00:00.000Z'));
  });
});

describe('enviarAvisosDePrazo (PRZ-04)', () => {
  it('pede os pendentes de 15 dias à frente, hoje e ontem; manda um e-mail por pessoa do tenant', async () => {
    vi.mocked(deadlineService.listDeadlinesToNotice).mockResolvedValue([
      deadline('a', 't1', '2026-11-25'),
      deadline('b', 't1', '2026-11-10'),
      deadline('c', 't1', '2026-11-09'),
      deadline('d', 't2', '2026-11-10'),
    ]);
    vi.mocked(accountService.listDeadlineReminderRecipients).mockResolvedValue([
      { tenantId: 't1', name: 'Ana', email: 'ana@x.com' },
      { tenantId: 't1', name: 'Bia', email: 'bia@x.com' },
    ]);
    vi.mocked(caseService.findSummariesByIds).mockResolvedValue(new Map([['per-a', { processNumber: '0001' }]]));
    const send = vi.fn().mockResolvedValue({ sent: true });

    const result = await sendDeadlineNotices({ mail: { send }, appUrl: 'https://app.ethica' }, now);

    expect(deadlineService.listDeadlinesToNotice).toHaveBeenCalledWith(['2026-11-25', '2026-11-10', '2026-11-09']);
    expect(accountService.listDeadlineReminderRecipients).toHaveBeenCalledWith(['t1', 't2']);
    // t2 não tem destinatário (aviso desligado, inativo ou suspenso): nenhum e-mail.
    expect(send.mock.calls.map((call) => call[0])).toEqual(['ana@x.com', 'bia@x.com']);
    expect(result).toEqual({ enviados: 2 });

    const html = send.mock.calls[0]?.[2] as string;
    expect(html).toContain('Venceram ontem');
    expect(html).toContain('Vencem hoje');
    expect(html).toContain('Vencem em 15 dias');
    expect(html).toContain('Prazo a');
    expect(html).toContain('https://app.ethica/expert-cases/details?id=per-a');
    expect(html).not.toContain('Prazo d');
  });

  it('sem prazo nos três dias não consulta destinatários nem envia', async () => {
    vi.mocked(deadlineService.listDeadlinesToNotice).mockResolvedValue([]);
    vi.mocked(accountService.listDeadlineReminderRecipients).mockClear();
    const send = vi.fn();

    await expect(sendDeadlineNotices({ mail: { send }, appUrl: '' }, now)).resolves.toEqual({ enviados: 0 });
    expect(accountService.listDeadlineReminderRecipients).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('título com HTML é escapado no e-mail', async () => {
    vi.mocked(deadlineService.listDeadlinesToNotice).mockResolvedValue([
      { ...deadline('x', 't1', '2026-11-10'), titulo: '<script>alert(1)</script>' },
    ]);
    vi.mocked(accountService.listDeadlineReminderRecipients).mockResolvedValue([
      { tenantId: 't1', name: 'Ana', email: 'ana@x.com' },
    ]);
    vi.mocked(caseService.findSummariesByIds).mockResolvedValue(new Map());
    const send = vi.fn().mockResolvedValue({ sent: true });

    await sendDeadlineNotices({ mail: { send }, appUrl: '' }, now);

    expect(send.mock.calls[0]?.[2]).toContain('&lt;script&gt;');
    expect(send.mock.calls[0]?.[2]).not.toContain('<script>');
  });
});
