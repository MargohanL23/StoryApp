/* eslint-disable no-restricted-globals */

// Konstanta base path untuk GitHub Pages
const BASE_PATH = '/storyappMargohan'; 

const urlsToCache = [
  BASE_PATH + '/', 
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  
  // Aset Dasar (Path harus menyertakan BASE_PATH)
  BASE_PATH + '/app.bundle.js', 
  BASE_PATH + '/styles.bundle.css', 
  
  // Path icons
  BASE_PATH + '/icons/icon-192.png',
  BASE_PATH + '/icons/icon-512.png',
  
  // Aset Leaflet (URL eksternal tidak perlu diubah)
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];
// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache).catch((err) => console.log('Cache add failed:', err)))
  );
  // Memaksa Service Worker segera aktif
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Logic cleanup cache lama
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          }
          return null;
        }).filter(p => p !== null) 
      )
    )
  );
  // Mengambil kontrol halaman segera setelah aktivasi
  self.clients.claim();
});

// Fetch Handler
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Penyesuaian path untuk GitHub Pages
  const requestUrl = event.request.url.replace(`${self.location.origin}/storyappMargohan`, self.location.origin);

  // --- Strategy: Stale-While-Revalidate untuk Data API (/stories) ---
  if (requestUrl.includes(STORY_API_URL) && !requestUrl.includes('push-subscribe')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(requestUrl);
        
        // Fetch baru di background
        const networkFetch = fetch(requestUrl)
          .then(async (response) => {
            if (response.status === 200 || response.type === 'opaque') {
              await cache.put(requestUrl, response.clone()); 
            }
            return response;
          })
          .catch((err) => {
            console.log('[SW] Network failed for API:', err);
            throw err; 
          });
        
        // Return cache yang sudah ada
        if (cachedResponse) {
             console.log('[SW] Serving from Data Cache');
             return cachedResponse;
        }
        
        // Fallback ke network, atau ke shell jika network gagal
        return networkFetch.catch(() => caches.match('/index.html')); 
      })
    );
    return;
  }

  // --- Strategy: Cache Falling Back to Network (Aset Statis) ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html')); // fallback offline shell
    })
  );
});


// ---------------------------------------------------------------------
// --- OFFLINE SYNC HANDLERS (IndexedDB & Sync) ---
// ---------------------------------------------------------------------

// --- Helper Functions (Asumsi diletakkan di sini) ---
async function getOfflineStoriesSW() { /* ... */ }
async function deleteOfflineStorySW(id) { /* ... */ }
const dataURLToBlob = (dataurl, filename) => { /* ... */ };
function getTokenFromClient() { /* ... */ }

// --- Sync Handler ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-stories') {
    console.log('SW: Triggering sync-offline-stories');
    event.waitUntil(syncOfflineStories());
  }
});

async function syncOfflineStories() {
  const stories = await getOfflineStoriesSW().catch((e) => {
    console.error('Error getting offline stories:', e);
    return [];
  });
  
  if (stories.length === 0) return;

  const token = await getTokenFromClient(); 

  // Token check dan throw Error untuk retry
  if (!token) { throw new Error('Missing token for sync'); }

  for (const story of stories) {
    // ... (Logika fetch POST dan penanganan Notifikasi) ...
  }
}


// ---------------------------------------------------------------------
// --- PUSH NOTIFICATION HANDLERS ---
// ---------------------------------------------------------------------

// Push Notification Handler 
self.addEventListener('push', (event) => { /* ... */ });

// Handle Notification Click (Navigasi Action)
self.addEventListener('notificationclick', (event) => { /* ... */ });
