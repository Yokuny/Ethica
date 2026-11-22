import { PROFILE_PERMISSIONS } from '@ethica/contracts';
import * as db from '@ethica/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as lock from '../queue/delivery-lock.js';
import { sendDigest } from './email-digest.js';

vi.mock('@ethica/db', async (original) => ({
  ...(await original<object>()),
  listPendingDueOn: vi.fn(),
  listFinanceDueUntil: vi.fn(),
  listDeliveryRecipients: vi.fn(),
  caseLabelsByIds: vi.fn(),
  listPushSubscriptions: vi.fn(),
}));
// The lock is the database's; here every person is the first to claim the day's digest.
vi.mock('../queue/delivery-lock.js', () => ({
  deliverOnce: vi.fn(async (_delivery: unknown, send: () => Promise<{ sent: boolean }>) =>
    (await send()).sent ? 'sent' : 'failed',
  ),
}));

// 2026-11-10 07:00 in São Paulo = 10:00 UTC.
const now = new Date('2026-11-10T10:00:00.000Z');

const deadline = (id: string, tenantId: string, dueDate: string): db.DueItem => ({
  id,
  tenantId,
  caseId: `per-${id}`,
  title: `Prazo ${id}`,
  dueDate,
});

const person = (tenantId: string, email: string, extra: Partial<db.DeliveryRecipient> = {}): db.DeliveryRecipient => ({
  userId: `u-${email}`,
  tenantId,
  name: email,
  email,
  permissions: PROFILE_PERMISSIONS.manager,
  ...extra,
});

describe('sendDigest — prazos (PRZ-04, AD-110)', () => {
  afterEach(() => vi.clearAllMocks());

  it('pede os pendentes de 15 dias à frente, hoje e ontem; manda um e-mail por pessoa do tenant', async () => {
    vi.mocked(db.listPendingDueOn).mockResolvedValue([
      deadline('a', 't1', '2026-11-25'),
      deadline('b', 't1', '2026-11-10'),
      deadline('c', 't1', '2026-11-09'),
      deadline('d', 't2', '2026-11-10'),
    ]);
    vi.mocked(db.listFinanceDueUntil).mockResolvedValue([]);
    vi.mocked(db.listDeliveryRecipients).mockResolvedValue([person('t1', 'ana@x.com'), person('t1', 'bia@x.com')]);
    vi.mocked(db.caseLabelsByIds).mockResolvedValue(new Map([['per-a', '0001']]));
    const send = vi.fn().mockResolvedValue({ sent: true });

    const result = await sendDigest({ mail: { send }, appUrl: 'https://app.ethica' }, now);

    expect(db.listPendingDueOn).toHaveBeenCalledWith(['2026-11-25', '2026-11-10', '2026-11-09']);
    expect(db.listDeliveryRecipients).toHaveBeenCalledWith(['t1', 't2'], now);
    // t2 has no recipient (inactive or closed office): no e-mail.
    expect(send.mock.calls.map((call) => call[0])).toEqual(['ana@x.com', 'bia@x.com']);
    expect(result).toEqual({ sent: 2 });
    expect(lock.deliverOnce).toHaveBeenCalledWith(
      { tenantId: 't1', userId: 'u-ana@x.com', channel: 'email', key: 'digest:2026-11-10' },
      expect.any(Function),
      now,
    );

    const html = send.mock.calls[0]?.[2] as string;
    expect(html).toContain('Venceram ontem');
    expect(html).toContain('Vencem hoje');
    expect(html).toContain('Vencem em 15 dias');
    expect(html).toContain('Prazo a');
    expect(html).toContain('https://app.ethica/expert-cases/details?id=per-a');
    expect(html).not.toContain('Prazo d');
  });

  it('sem prazo nem lançamento não consulta destinatários nem envia', async () => {
    vi.mocked(db.listPendingDueOn).mockResolvedValue([]);
    vi.mocked(db.listFinanceDueUntil).mockResolvedValue([]);
    const send = vi.fn();

    await expect(sendDigest({ mail: { send }, appUrl: '' }, now)).resolves.toEqual({ sent: 0 });
    expect(db.listDeliveryRecipients).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('título com HTML é escapado no e-mail', async () => {
    vi.mocked(db.listPendingDueOn).mockResolvedValue([
      { ...deadline('x', 't1', '2026-11-10'), title: '<script>alert(1)</script>' },
    ]);
    vi.mocked(db.listFinanceDueUntil).mockResolvedValue([]);
    vi.mocked(db.listDeliveryRecipients).mockResolvedValue([person('t1', 'ana@x.com')]);
    vi.mocked(db.caseLabelsByIds).mockResolvedValue(new Map());
    const send = vi.fn().mockResolvedValue({ sent: true });

    await sendDigest({ mail: { send }, appUrl: '' }, now);

    expect(send.mock.calls[0]?.[2]).toContain('&lt;script&gt;');
    expect(send.mock.calls[0]?.[2]).not.toContain('<script>');
  });
});

describe('sendDigest — financeiro e preferências (CNT-03, CNT-05)', () => {
  afterEach(() => vi.clearAllMocks());

  const finance = (id: string, dueDate: string): db.FinanceDueItem => ({
    id,
    tenantId: 't1',
    kind: 'income',
    description: `Honorário ${id}`,
    dueDate,
    openCents: 150_000,
  });

  it('o financeiro vai só a quem vê o financeiro; atrasado, hoje e em 7 dias; desligado não recebe', async () => {
    vi.mocked(db.listPendingDueOn).mockResolvedValue([]);
    vi.mocked(db.listFinanceDueUntil).mockResolvedValue([
      finance('late', '2026-10-01'),
      finance('today', '2026-11-10'),
      finance('in3', '2026-11-13'),
      finance('in7', '2026-11-17'),
    ]);
    vi.mocked(db.listDeliveryRecipients).mockResolvedValue([
      person('t1', 'admin@x.com'),
      person('t1', 'op@x.com', { permissions: PROFILE_PERMISSIONS.operator }),
      person('t1', 'off@x.com', { preferences: { finance: { email: false } } }),
    ]);
    vi.mocked(db.caseLabelsByIds).mockResolvedValue(new Map());
    const send = vi.fn().mockResolvedValue({ sent: true });

    await sendDigest({ mail: { send }, appUrl: 'https://app.ethica' }, now);

    expect(db.listFinanceDueUntil).toHaveBeenCalledWith('2026-11-17');
    expect(send.mock.calls.map((call) => call[0])).toEqual(['admin@x.com']);
    const html = send.mock.calls[0]?.[2] as string;
    expect(html).toContain('Lançamentos atrasados');
    expect(html).toContain('Honorário late');
    expect(html).toContain('Honorário today');
    expect(html).toContain('Honorário in7');
    expect(html).not.toContain('Honorário in3');
  });

  it('quem desligou o e-mail de prazos não recebe os prazos', async () => {
    vi.mocked(db.listPendingDueOn).mockResolvedValue([deadline('a', 't1', '2026-11-10')]);
    vi.mocked(db.listFinanceDueUntil).mockResolvedValue([]);
    vi.mocked(db.listDeliveryRecipients).mockResolvedValue([
      person('t1', 'on@x.com'),
      person('t1', 'off@x.com', { preferences: { deadlines: { email: false } } }),
    ]);
    vi.mocked(db.caseLabelsByIds).mockResolvedValue(new Map());
    const send = vi.fn().mockResolvedValue({ sent: true });

    await sendDigest({ mail: { send }, appUrl: '' }, now);

    expect(send.mock.calls.map((call) => call[0])).toEqual(['on@x.com']);
  });
});

describe('sendDigest — push (AVS-03)', () => {
  afterEach(() => vi.clearAllMocks());

  it('manda só as contagens no push, sem valor nem nome; quem desligou o push não recebe', async () => {
    vi.mocked(db.listPendingDueOn).mockResolvedValue([
      deadline('a', 't1', '2026-11-10'),
      deadline('b', 't1', '2026-11-09'),
    ]);
    vi.mocked(db.listFinanceDueUntil).mockResolvedValue([
      {
        id: 'f',
        tenantId: 't1',
        kind: 'income',
        description: 'Honorário Fulano',
        dueDate: '2026-11-01',
        openCents: 99_900,
      },
    ]);
    vi.mocked(db.listDeliveryRecipients).mockResolvedValue([
      person('t1', 'on@x.com'),
      person('t1', 'off@x.com', { preferences: { deadlines: { push: false }, finance: { push: false } } }),
    ]);
    vi.mocked(db.caseLabelsByIds).mockResolvedValue(new Map());
    const device = { endpoint: 'https://push/1', keys: { p256dh: 'p', auth: 'a' } };
    vi.mocked(db.listPushSubscriptions).mockResolvedValue(
      new Map([
        ['u-on@x.com', [device]],
        ['u-off@x.com', [device]],
      ]),
    );
    const push = { send: vi.fn().mockResolvedValue({ sent: true }) };

    await sendDigest({ mail: { send: vi.fn().mockResolvedValue({ sent: true }) }, appUrl: '', push }, now);

    expect(push.send).toHaveBeenCalledTimes(1);
    const message = push.send.mock.calls[0]?.[1];
    expect(message).toEqual({
      title: 'Ethica',
      body: 'Hoje: 2 prazos e alertas e 1 lançamento.',
      url: '/notifications',
    });
    expect(JSON.stringify(message)).not.toContain('Fulano');
  });
});
