import { connect, disconnect, Notification, syncWorkerIndexes, Tenant, Transaction, WorkerJob } from '@ethica/db';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { sweepReminders } from './reminders-sweep.js';

// 2026-11-22 12:00 in São Paulo.
const now = new Date('2026-11-22T15:00:00.000Z');

describe('varredura de lembretes (CNT-03, AD-275)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
    await syncWorkerIndexes();
    await Notification.createIndexes();
  });
  afterEach(async () => {
    await Promise.all([
      Notification.deleteMany({}),
      Tenant.deleteMany({}),
      Transaction.deleteMany({}),
      WorkerJob.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('lançamento atrasado vira um aviso finance_due; a segunda varredura não repete', async () => {
    const tenant = await Tenant.create({ name: 'Escritório', document: '11222333000181', status: 'active' });
    await Transaction.create({
      Tenant: tenant._id,
      kind: 'income',
      category: 'advance_fees',
      description: 'Honorário',
      amountCents: 100_000,
      dueDate: '2026-11-01',
      status: 'expected',
    });
    // Far from every window: no notice.
    await Transaction.create({
      Tenant: tenant._id,
      kind: 'expense',
      category: 'travel',
      description: 'Viagem',
      amountCents: 5_000,
      dueDate: '2026-11-25',
      status: 'expected',
    });

    expect(await sweepReminders(now)).toEqual({ created: 1 });
    expect(await sweepReminders(now)).toEqual({ created: 0 });
    const [notice] = await Notification.find({ kind: 'notice' }).lean();
    expect(notice).toMatchObject({ topic: 'finance_due', module: 'finance', params: { bucket: 'overdue' } });
  });

  it('premium que vence em 7 dias vira aviso crítico com e-mail na fila, uma vez só', async () => {
    const ending = await Tenant.create({
      name: 'Premium',
      document: '11444777000161',
      status: 'active',
      automationUntil: new Date('2026-11-27T03:00:00.000Z'),
    });
    await Tenant.create({
      name: 'Longe',
      document: '11222333000262',
      status: 'active',
      automationUntil: new Date('2027-01-27T03:00:00.000Z'),
    });

    expect(await sweepReminders(now)).toEqual({ created: 1 });
    expect(await sweepReminders(now)).toEqual({ created: 0 });
    const notices = await Notification.find({ topic: 'automation_expiring' }).lean();
    expect(notices.map((notice) => String(notice.Tenant))).toEqual([String(ending._id)]);
    expect(await WorkerJob.countDocuments({ kind: 'email_immediate' })).toBe(1);
  });
});
