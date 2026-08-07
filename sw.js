'use strict';

const CACHE = 'markov-health-os-v1.1.0';
const OFFLINE_INDEX = new URL('./index.html', self.registration.scope).href;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './privacy.html',
  './terms.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          if (response.ok) {
            const copy = response.clone();
            await caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => (
          await caches.match(event.request)
          || await caches.match(OFFLINE_INDEX)
          || Response.error()
        ))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(async response => {
        if (response.ok) {
          const copy = response.clone();
          await caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
