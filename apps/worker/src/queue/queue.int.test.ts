import { connect, disconnect, NotificationDelivery, newObjectId, syncWorkerIndexes, WorkerJob } from '@ethica/db';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DELIVERY_LEASE_MS, deliverOnce } from './delivery-lock.js';
import { claim, enqueue, runOne } from './queue.js';

describe('fila e trava de entrega do worker (AD-267)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
    await syncWorkerIndexes();
  });
  afterEach(async () => {
    await Promise.all([WorkerJob.deleteMany({}), NotificationDelivery.deleteMany({})]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('a mesma janela do agendador não entra duas vezes (dedupeKey)', async () => {
    expect(await enqueue('email_digest', {}, { dedupeKey: 'email_digest:2026-11-22T07' })).toBe(true);
    expect(await enqueue('email_digest', {}, { dedupeKey: 'email_digest:2026-11-22T07' })).toBe(false);
    expect(await WorkerJob.countDocuments({})).toBe(1);
  });

  it('prioridade menor sai primeiro; um job com lease vencido é retomado por outro worker', async () => {
    await enqueue('b', {}, { priority: 20 });
    await enqueue('a', {}, { priority: 10 });
    const first = await claim('w1', 60_000);
    expect(first?.kind).toBe('a');
    expect(await claim('w2', 60_000, new Date())).toMatchObject({ kind: 'b' });
    // w1 died: after the lease another worker takes job `a`.
    expect(await claim('w2', 60_000, new Date(Date.now() + 61_000))).toMatchObject({
      kind: 'a',
      lockedBy: 'w2',
      attempts: 2,
    });
  });

  it('job com erro volta para a fila com espera; job desconhecido falha de vez', async () => {
    await enqueue('boom');
    await enqueue('unknown');
    const handlers = { boom: async () => Promise.reject(new Error('falhou')) };
    await runOne(handlers, 'w1', 60_000);
    await runOne(handlers, 'w1', 60_000);
    const jobs = await WorkerJob.find({}).sort({ kind: 1 }).lean();
    expect(jobs.map((job) => [job.kind, job.status])).toEqual([
      ['boom', 'queued'],
      ['unknown', 'failed'],
    ]);
    expect(jobs[0]?.runAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('job com mais tentativas segue na fila depois da quinta falha (429 do TRT16 em 2026-11-23)', async () => {
    await enqueue('court', {}, { maxAttempts: 7 });
    const handlers = { court: async () => Promise.reject(new Error('TRT16 respondeu 429')) };
    // Each attempt runs after the previous backoff.
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await runOne(handlers, 'w1', 60_000, new Date(Date.now() + attempt * 86_400_000));
    }
    expect(await WorkerJob.findOne({}).lean()).toMatchObject({ status: 'queued', attempts: 6 });
    await runOne(handlers, 'w1', 60_000, new Date(Date.now() + 7 * 86_400_000));
    expect(await WorkerJob.findOne({}).lean()).toMatchObject({ status: 'failed', attempts: 7 });
  });

  const delivery = () => ({
    tenantId: newObjectId().toString(),
    userId: newObjectId().toString(),
    channel: 'email' as const,
    key: 'digest:2026-11-22',
  });

  it('duas varreduras ao mesmo tempo mandam uma vez só', async () => {
    const target = delivery();
    let sends = 0;
    const send = async () => {
      sends += 1;
      return { sent: true };
    };
    const results = await Promise.all([deliverOnce(target, send), deliverOnce(target, send)]);
    expect(results.sort()).toEqual(['sent', 'skipped']);
    expect(sends).toBe(1);
    expect(await deliverOnce(target, send)).toBe('skipped');
  });

  it('envio que falha libera a trava para a próxima varredura; trava presa além do lease é retomada', async () => {
    const target = delivery();
    expect(await deliverOnce(target, async () => ({ sent: false }))).toBe('failed');
    expect(await NotificationDelivery.countDocuments({})).toBe(0);
    expect(await deliverOnce(target, async () => ({ sent: true }))).toBe('sent');

    const stuck = { ...delivery(), key: 'digest:2026-11-23' };
    await NotificationDelivery.create({
      Tenant: stuck.tenantId,
      User: stuck.userId,
      channel: 'email',
      key: stuck.key,
      claimedAt: new Date(Date.now() - DELIVERY_LEASE_MS - 1000),
    });
    expect(await deliverOnce(stuck, async () => ({ sent: true }))).toBe('sent');
  });
});
