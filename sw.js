// ============================================================
// NCHSM Service Worker — v2.2.0 (safe version)
// Caches static assets ONLY. Never caches Supabase API.
// ============================================================

const APP_VERSION  = '2.2.0';
const CACHE_NAME   = `nchsm-dashboard-v${APP_VERSION.replace(/\./g, '-')}`;
const STATIC_CACHE = 'nchsm-static-v1';

// ---- Static assets to precache ----
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/student.html',
    '/manifest.json',
    '/css/main.css',
    '/css/dashboard.css',
    '/js/database.js',
    '/js/utils.js',
    '/js/ui.js',
    '/js/dashboard.js',
    '/js/profile.js',
    '/js/attendance.js',
    '/js/courses.js',
    '/js/exams.js',
    '/js/unit-registration.js',
    '/js/resources.js',
    '/js/calendar.js',
    '/js/messages.js',
    '/js/student-tickets.js',
    '/js/nurseiq.js',
    '/js/exam-card.js',
    '/js/academic-reports.js',
    '/js/gamification.js',
    '/config.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

const libraryUrls = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ---- Anything matching these BYPASSES the cache entirely ----
const BYPASS_PATTERNS = [
    /supabase\.co/i,
    /supabase\.in/i,
    /\/rest\/v1\//i,
    /\/auth\/v1\//i,
    /\/realtime\/v1\//i,
    /\/storage\/v1\//i,
    /\/functions\/v1\//i,
    /\/rpc\//i,
    /googleapis\.com\/.*\/v1/i
];

const shouldBypass = (url) => BYPASS_PATTERNS.some(rx => rx.test(url));

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Add one at a time so a single 404 doesn't kill install
        await Promise.all(urlsToCache.map(async url => {
            try {
                const resp = await fetch(url, { cache: 'reload' });
                if (resp && resp.ok) await cache.put(url, resp);
                else console.warn('⚠️ skip:', url, resp && resp.status);
            } catch (e) {
                console.warn('⚠️ skip (fetch):', url, e.message);
            }
        }));

        const libCache = await caches.open(STATIC_CACHE);
        await Promise.all(libraryUrls.map(async url => {
            try {
                const resp = await fetch(url, { cache: 'reload' });
                if (resp && resp.ok) await libCache.put(url, resp);
            } catch (e) {
                console.warn('⚠️ skip lib:', url, e.message);
            }
        }));

        await self.skipWaiting();
    })());
});

// ============================================================
// ACTIVATE — clean old caches
// ============================================================
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => {
            if (k !== CACHE_NAME && k !== STATIC_CACHE) {
                console.log('🗑️ deleting old cache:', k);
                return caches.delete(k);
            }
        }));
        await self.clients.claim();
        console.log('✅ SW activated (v' + APP_VERSION + ')');
    })());
});

// ============================================================
// MESSAGE
// ============================================================
self.addEventListener('message', e => {
    if (e.data === 'skipWaiting') self.skipWaiting();
    if (e.data === 'CLEAR_CACHES') {
        caches.keys().then(k => Promise.all(k.map(x => caches.delete(x))));
    }
});

// ============================================================
// FETCH
// ============================================================
self.addEventListener('fetch', event => {
    const req = event.request;

    // 1. Never touch non-GET
    if (req.method !== 'GET') return;

    const url = req.url;

    // 2. Never touch Supabase / API — let the browser handle it raw
    if (shouldBypass(url)) return;

    // 3. Only handle navigations + same-origin static files
    const isNavigation = req.mode === 'navigate';
    const isStatic =
        /\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(url) ||
        url.endsWith('.html');

    if (!isNavigation && !isStatic) return;

    // 4. Stale-while-revalidate for assets, network-first for navigations
    event.respondWith((async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(req);

            const networkPromise = fetch(req)
                .then(resp => {
                    if (resp && resp.ok && new URL(req.url).origin === self.location.origin) {
                        // Clone BEFORE reading
                        cache.put(req, resp.clone()).catch(() => {});
                    }
                    return resp;
                })
                .catch(err => {
                    console.warn('⚠️ network failed:', req.url, err.message);
                    return null;
                });

            if (isNavigation) {
                const fresh = await networkPromise;
                if (fresh) return fresh;
                if (cached) return cached;
                return new Response('Offline', { status: 503 });
            }

            if (cached) return cached;
            const fresh = await networkPromise;
            if (fresh) return fresh;

            return new Response('', { status: 504 });
        } catch (e) {
            console.warn('SW fetch error:', e);
            return new Response('', { status: 500 });
        }
    })());
});
