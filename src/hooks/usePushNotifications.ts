import { supabase } from '@/integrations/supabase/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return;
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('VITE_VAPID_PUBLIC_KEY not configured');
    return;
  }

  // Wait for the PWA service worker (registered by vite-plugin-pwa)
  const registration = await navigator.serviceWorker.ready;

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return;
  }

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const subJson = subscription.toJSON();
  const endpoint = subJson.endpoint!;
  const p256dh = subJson.keys!.p256dh!;
  const auth = subJson.keys!.auth!;

  // Upsert: check existing then insert or update
  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('push_subscriptions')
      .update({ p256dh, auth })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('push_subscriptions')
      .insert({ user_id: userId, endpoint, p256dh, auth });
  }

  console.log('Push subscription registered successfully');
}
