'use strict';

const CACHE_PREFIX = 'rolmensualpwa-roles-';
const CACHE_NAME = `${CACHE_PREFIX}v4.1.0`;
const LEGACY_CACHE_NAMES = new Set(['hsjd-turnos-v1.0.0']);
const SCOPE = new URL(self.registration.scope);
const FALLBACK = new URL('./index.html', SCOPE).toString();
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/config.js',
  './js/db.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
].map((path) => new URL(path, SCOPE).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) || LEGACY_CACHE_NAMES.has(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(FALLBACK, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match(FALLBACK)) || Response.error();
      }
    })());
    return;
  }

  const networkPromise = fetch(request).then(async (response) => {
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  event.respondWith(caches.match(request).then((cached) => {
    if (cached) {
      event.waitUntil(networkPromise);
      return cached;
    }
    return networkPromise.then((response) => response || new Response('', { status: 504, statusText: 'Offline' }));
  }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
