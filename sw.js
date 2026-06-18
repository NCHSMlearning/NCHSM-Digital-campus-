// NCHSM Dashboard Service Worker - v2.1.0
const APP_VERSION = '2.1.0';
const CACHE_NAME = `nchsm-dashboard-v${APP_VERSION.replace(/\./g, '-')}`;
const API_CACHE_NAME = 'nchsm-api-v1';
const STATIC_CACHE_NAME = 'nchsm-static-v1';

// Files to cache on install
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

// Third-party libraries (cache separately)
const libraryUrls = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache main assets
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log(`📦 Caching app assets (v${APP_VERSION})`);
          return cache.addAll(urlsToCache);
        })
        .catch(err => console.warn('Cache warning:', err)),
      // Cache libraries
      caches.open(STATIC_CACHE_NAME)
        .then(cache => {
          console.log('📦 Caching third-party libraries');
          return cache.addAll(libraryUrls);
        })
        .catch(err => console.warn('Library cache warning:', err))
    ])
    .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATE EVENT - Clean old caches
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Keep only current caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker activated, taking control...');
      return self.clients.claim();
    })
  );
});

// ============================================
// MESSAGE HANDLER - Force update
// ============================================
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ============================================
// FETCH EVENT - Optimized strategies
// ============================================
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  const url = event.request.url;

  // ==========================================
  // 1. SUPABASE API CACHING (5 minutes)
  // ==========================================
  if (url.includes('supabase.co/rest/v1/') || 
      url.includes('supabase.co/rpc/') ||
      url.includes('supabase.co/auth/v1/')) {
    
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request)
            .then(response => {
              // Only cache successful responses
              if (response && response.status === 200) {
                const cloned = response.clone();
                // Store with timestamp
                const headers = new Headers(cloned.headers);
                headers.set('sw-cache-timestamp', Date.now().toString());
                const cachedResponse = new Response(cloned.body, {
                  status: cloned.status,
                  statusText: cloned.statusText,
                  headers: headers
                });
                cache.put(event.request, cachedResponse);
              }
              return response;
            })
            .catch(() => {
              // If network fails and we have cached, return it
              if (cached) {
                console.log('📡 API offline - serving cached response');
                return cached;
              }
              // Return offline JSON error
              return new Response(JSON.stringify({ 
                error: 'Offline', 
                message: 'Please check your internet connection' 
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          
          // Return cached immediately, update in background
          if (cached) {
            // Check if cached is stale (> 5 minutes)
            const cacheTime = parseInt(cached.headers.get('sw-cache-timestamp') || '0');
            const isStale = (Date.now() - cacheTime) > 300000; // 5 minutes
            
            if (isStale) {
              // Return cached but update in background
              fetchPromise.catch(() => {});
              return cached;
            }
            return cached;
          }
          
          return fetchPromise;
        });
      })
    );
    return;
  }

  // ==========================================
  // 2. HTML PAGES - Network First
  // ==========================================
  if (url.includes('student.html') || 
      url.includes('login.html') || 
      url.includes('index.html') ||
      url.includes('dashboard') ||
      url.match(/\/$/)) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, cloned))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(event.request)
            .then(cached => {
              if (cached) return cached;
              // Ultimate fallback
              return caches.match('/student.html') || 
                     caches.match('/index.html') || 
                     caches.match('/login.html');
            });
        })
    );
    return;
  }

  // ==========================================
  // 3. STATIC ASSETS - Cache First
  // ==========================================
  if (url.includes('.css') || 
      url.includes('.js') && !url.includes('supabase') ||
      url.includes('.woff') || 
      url.includes('.woff2') || 
      url.includes('.ttf') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('font-awesome')) {
    
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            // Check if we need to update (24 hours old)
            const cacheTime = parseInt(response.headers.get('sw-cache-timestamp') || '0');
            const isStale = (Date.now() - cacheTime) > 86400000; // 24 hours
            
            if (isStale) {
              // Update in background
              fetch(event.request)
                .then(fresh => {
                  if (fresh && fresh.status === 200) {
                    const cloned = fresh.clone();
                    caches.open(CACHE_NAME)
                      .then(cache => cache.put(event.request, cloned))
                      .catch(() => {});
                  }
                })
                .catch(() => {});
            }
            return response;
          }
          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                const cloned = response.clone();
                const headers = new Headers(cloned.headers);
                headers.set('sw-cache-timestamp', Date.now().toString());
                const cachedResponse = new Response(cloned.body, {
                  status: cloned.status,
                  statusText: cloned.statusText,
                  headers: headers
                });
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, cachedResponse))
                  .catch(() => {});
              }
              return response;
            });
        })
    );
    return;
  }

  // ==========================================
  // 4. IMAGES - Cache First with fallback
  // ==========================================
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) {
            return cached;
          }
          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                const cloned = response.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then(cache => cache.put(event.request, cloned))
                  .catch(() => {});
              }
              return response;
            })
            .catch(() => {
              // Return a placeholder image
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#e5e7eb"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="14">Image</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        })
    );
    return;
  }

  // ==========================================
  // 5. DEFAULT - Cache First / Network Fallback
  // ==========================================
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const cloned = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, cloned))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => {
            // Return a simple offline page
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f5f5f5}button{padding:12px 24px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px}</style></head><body><h1>📡 You are Offline</h1><p>Please check your internet connection and try again.</p><button onclick="location.reload()">Retry</button></body></html>',
              { status: 503, headers: { 'Content-Type': 'text/html' } }
            );
          });
      })
  );
});

// ============================================
// PERIODIC CLEANUP - Keep cache size manageable
// ============================================
setInterval(() => {
  caches.open(API_CACHE_NAME).then(cache => {
    cache.keys().then(keys => {
      // Keep only the latest 100 API responses
      if (keys.length > 100) {
        // Delete oldest entries
        const entriesToDelete = keys.slice(0, keys.length - 100);
        entriesToDelete.forEach(key => cache.delete(key));
      }
    });
  });
}, 60000); // Run every minute
