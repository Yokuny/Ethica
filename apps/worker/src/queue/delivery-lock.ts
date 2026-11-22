import { NotificationDelivery } from '@ethica/db';

// Delivery lock (AD-147, AD-267): the unique index {User, channel, key} decides who sends. The claim is
// inserted BEFORE sending; `sentAt` after; a failed send deletes the claim so the next sweep tries again.
// A claim without `sentAt` older than the lease (a worker that died in the middle) is taken over.
export const DELIVERY_LEASE_MS = 10 * 60_000;

type Delivery = { tenantId: string; userId: string; channel: 'email' | 'push'; key: string };

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

export const claimDelivery = async (
  { tenantId, userId, channel, key }: Delivery,
  now = new Date(),
): Promise<boolean> => {
  try {
    await NotificationDelivery.create({ Tenant: tenantId, User: userId, channel, key, claimedAt: now });
    return true;
  } catch (e) {
    if (!isDuplicateKey(e)) throw e;
    const taken = await NotificationDelivery.findOneAndUpdate(
      {
        User: userId,
        channel,
        key,
        sentAt: { $exists: false },
        claimedAt: { $lt: new Date(now.getTime() - DELIVERY_LEASE_MS) },
      },
      { $set: { claimedAt: now } },
    );
    return Boolean(taken);
  }
};

export const markSent = ({ userId, channel, key }: Delivery, now = new Date()) =>
  NotificationDelivery.updateOne({ User: userId, channel, key }, { $set: { sentAt: now } });

export const releaseDelivery = ({ userId, channel, key }: Delivery) =>
  NotificationDelivery.deleteOne({ User: userId, channel, key, sentAt: { $exists: false } });

// Claims, sends and records; a send that returns `sent: false` releases the claim (retried in the next sweep).
export const deliverOnce = async (delivery: Delivery, send: () => Promise<{ sent: boolean }>, now = new Date()) => {
  if (!(await claimDelivery(delivery, now))) return 'skipped' as const;
  const { sent } = await send().catch(() => ({ sent: false }));
  if (sent) {
    await markSent(delivery, now);
    return 'sent' as const;
  }
  await releaseDelivery(delivery);
  console.error(JSON.stringify({ event: 'worker.delivery_failed', channel: delivery.channel, key: delivery.key }));
  return 'failed' as const;
};
