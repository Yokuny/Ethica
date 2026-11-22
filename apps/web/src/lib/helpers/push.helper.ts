import { del, get, post } from '../api/client.api.js';

// Push on this device (AVS-03): the browser inscription goes to the api; signing out removes it. Only where
// the browser supports it and the service worker runs (production build).
export const pushSupported = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

export const pushPublicKey = async (): Promise<string | undefined> => {
  const res = await get<{ publicKey?: string }>('/me/push');
  return res.success ? res.data?.publicKey : undefined;
};

export const currentPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
};

// `denied` = the person blocked notifications of the site in the browser.
export const turnPushOn = async (publicKey: string): Promise<'on' | 'denied'> => {
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey),
  });
  await post('/me/push-subscriptions', subscription.toJSON());
  return 'on';
};

export const turnPushOff = async (): Promise<void> => {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  await del(`/me/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`).catch(() => undefined);
  await subscription.unsubscribe();
};
