importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBRiMjraiaL2UUohfTjswkPj3C3td9lsn4',
  authDomain: 'safarbus-2b9b0.firebaseapp.com',
  projectId: 'safarbus-2b9b0',
  storageBucket: 'safarbus-2b9b0.firebasestorage.app',
  messagingSenderId: '771850549676',
  appId: '1:771850549676:web:f58b8f04cb9a48f8c62209',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Bolman';
  const options = {
    body: payload.notification?.body || '',
    icon: '/logo.svg',
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus an already-open dashboard tab instead of stacking up new windows.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => 'focus' in client);
      if (existing) return existing.focus();
      return clients.openWindow('/');
    }),
  );
});
