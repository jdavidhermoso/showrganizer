const CACHE = 'showrganizer-v1';

const STATIC_ASSETS = [
    '/assets/css/main.css',
    '/assets/js/chistes.js',
    '/assets/js/editor.js',
    '/assets/js/composer.js',
    '/assets/js/chiste_form.js',
    '/assets/logo.webp',
    '/assets/logo-192.png',
    '/assets/logo-512.png',
    '/offline.html',
];

// Instalar: cachear assets estáticos
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: cache-first para estáticos, network-first para todo lo demás
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Solo interceptar peticiones del mismo origen
    if (url.origin !== self.location.origin) return;

    // API: siempre red, sin caché
    if (url.pathname.startsWith('/api/')) return;

    // Assets estáticos: cache-first
    if (url.pathname.startsWith('/assets/')) {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request))
        );
        return;
    }

    // Páginas: network-first, fallback a offline.html
    e.respondWith(
        fetch(e.request)
            .catch(() => caches.match('/offline.html'))
    );
});
