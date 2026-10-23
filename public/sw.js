// A deliberately small service worker. Browsers only offer "Install app" to a site that has one, and the app is not
// meant to work offline (voting and payments need the network), so it caches nothing and passes every request through.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => {
  // Only pages and files; leave the API and anything that is not a plain GET to the browser.
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith(fetch(event.request))
})
