// Carpentry Concierge — service worker (job alerts via Web Push).
// Registered by /concierge/directory.html with scope /concierge/ — completely
// separate from the dispatch app's /sw.js at the site root. Do not merge.

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || 'Carpentry Concierge';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: data.icon || '/images/logo.png',
    badge: data.icon || '/images/logo.png',
    data: { url: data.url || '/concierge/directory.html#jobs' }
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/concierge/directory.html#jobs';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('/concierge/') >= 0 && 'focus' in list[i]) {
          list[i].navigate(url);
          return list[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
