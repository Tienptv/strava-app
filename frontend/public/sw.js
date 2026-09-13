self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Thông báo từ HRC';
      const options = {
        body: data.body || 'Bạn có một thông báo mới',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        data: {
          url: data.url || '/'
        },
        vibrate: [200, 100, 200, 100, 200, 100, 200]
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
      // Fallback if not JSON
      const title = 'Thông báo từ HRC';
      const options = {
        body: event.data.text(),
        icon: '/icon-192.png'
      };
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
