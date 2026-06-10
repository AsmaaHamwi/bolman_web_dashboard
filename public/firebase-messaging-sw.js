/* Configure Firebase messaging service worker for production if web push is enabled. */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.notification?.title || 'Bolman';
  const options = {
    body: data.notification?.body || '',
    icon: '/logo.svg',
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
