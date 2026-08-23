import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { supabase } from './supabase';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export async function registerWebFcmToken() {
  if (!(await isSupported())) return null;
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return null;
  if (!('serviceWorker' in navigator)) return null;

  const messaging = getMessaging(firebaseApp);
  const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });
  if (!token) return null;
  const { error } = await supabase.rpc('register_fcm_token', {
    p_token: token,
    p_platform: 'web',
    p_device_id: navigator.userAgent.slice(0, 150),
  });
  if (error) {
    // Surfaced rather than swallowed: a failure here is the difference between
    // "push is set up" and a device that silently never receives anything.
    console.error('register_fcm_token failed', error);
    throw error;
  }

  listenForForegroundMessages();
  return token;
}

let foregroundListenerAttached = false;

/** The service worker only fires onBackgroundMessage. A focused tab needs this,
 *  otherwise a push arriving while the dashboard is open is dropped silently. */
export function listenForForegroundMessages() {
  if (foregroundListenerAttached) return;
  foregroundListenerAttached = true;

  const messaging = getMessaging(firebaseApp);
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'Bolman';
    const body = payload.notification?.body ?? '';
    try {
      new Notification(title, { body, icon: '/logo.svg' });
    } catch {
      // Some browsers only allow notifications from the service worker.
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, { body, icon: '/logo.svg' }))
        .catch(() => undefined);
    }
  });
}
