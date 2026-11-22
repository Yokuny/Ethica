import { PushSubscription } from '@ethica/db';
import webpush from 'web-push';

// Web Push (AVS-03): the text never carries an amount nor a party name (it shows on the locked screen).
export type PushMessage = { title: string; body: string; url: string };
export type PushSender = {
  send: (
    subscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[],
    message: PushMessage,
  ) => Promise<{
    sent: boolean;
  }>;
};

export const createPushSender = (vapid: { publicKey: string; privateKey: string; subject: string }): PushSender => {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return {
    send: async (subscriptions, message) => {
      let sent = false;
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(message), { TTL: 86_400 });
          sent = true;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // The browser dropped the inscription (expired or revoked): it leaves the database.
          if (status === 404 || status === 410) await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
          else console.error(JSON.stringify({ event: 'worker.push_failed', status }));
        }
      }
      return { sent };
    },
  };
};
