/**
 * sw.js — HealthGuard Service Worker
 * Caches all app files for offline access (PWA requirement).
 */

const CACHE_NAME = 'healthguard-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/patient.html',
  '/caregiver.html',
  '/js/storage.js',
  '/js/location.js',
  '/js/reminders.js',
  '/manifest.json',
];

// Install: pre-cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first (offline-first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
