const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (e) {
    console.warn('Service Worker registration failed:', e);
    return null;
  }
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const parsed = JSON.parse(JSON.stringify(subscription));
    const { pushNotifications } = await import('@/lib/api');

    await pushNotifications.subscribe({
      endpoint: parsed.endpoint,
      keys: {
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
      },
    });

    return subscription;
  } catch (e) {
    console.warn('Push subscription failed:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
