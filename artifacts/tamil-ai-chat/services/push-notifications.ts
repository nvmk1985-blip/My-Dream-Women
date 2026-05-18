const API_BASE = '/api';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch { return null; }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/push/vapid-key`);
  const { publicKey } = await res.json() as { publicKey: string };
  return publicKey;
}

export async function subscribeToPush(
  intervals: Record<string, number>,
  personaNames: Record<string, string>,
): Promise<boolean> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    const reg = await registerServiceWorker();
    if (!reg) return false;

    await navigator.serviceWorker.ready;
    const vapidKey = await getVapidPublicKey();

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
    }

    const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subJson, intervals, personaNames }),
    });

    return true;
  } catch { return false; }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch {}
}

export function isPushSupported(): boolean {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function getNotificationPermission(): string {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}
