// Service Worker for TaskForce PWA
const CACHE_NAME = 'taskforce-v15';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache opened');
                return cache.addAll(urlsToCache);
            })
            .catch((err) => {
                console.log('Cache failed:', err);
            })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    let data = { title: 'TaskForce', body: 'Du hast dringende Aufgaben!' };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        data.body = event.data ? event.data.text() : data.body;
    }

    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 400], // Stronger vibration
        requireInteraction: true,
        tag: 'taskforce-alert',
        renotify: true,
        actions: [
            { action: 'open', title: 'Öffnen' },
            { action: 'dismiss', title: 'Später' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '⚡ TaskForce', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
