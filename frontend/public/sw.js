// Service Worker for TraderWeb PWA
// Version: 7 - Cache strategy tuned to avoid stale Next.js chunks

// Import Firebase scripts using importScripts (works in service workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyBCkFVdozRjeHhKBNRwmz9ht0uEr8AmsTo',
  authDomain: 'my-trader-9e446.firebaseapp.com',
  projectId: 'my-trader-9e446',
  storageBucket: 'my-trader-9e446.firebasestorage.app',
  messagingSenderId: '936748321472',
  appId: '1:936748321472:web:68573ed6f74645a606bb25',
  measurementId: 'G-TMQDJY1BVM'
};

let messaging;
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ [SW] Firebase initialized successfully');
  
  // Retrieve an instance of Firebase Messaging so that it can handle background messages
  messaging = firebase.messaging();
  console.log('✅ [SW] Firebase Messaging initialized successfully');
  
  // Make messaging available globally for Firebase SDK detection
  self.firebaseMessaging = messaging;
} catch (error) {
  console.error('❌ [SW] Firebase initialization error:', error);
}

// Deduplication: Track recent notifications to prevent duplicates
let notificationShown = false;
const NOTIFICATION_TIMEOUT = 1000; // 1 second cooldown

// Handle incoming messages while the app is in the background
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('🔔 [SERVICE WORKER] Received background message:', payload);
    console.log('🔔 [SERVICE WORKER] Notification title:', payload.notification?.title);
    console.log('🔔 [SERVICE WORKER] Notification body:', payload.notification?.body);
    
    // Prevent duplicate notifications within timeout window
    if (notificationShown) {
      console.log('⚠️ [SERVICE WORKER] Duplicate push ignored (within timeout window)');
      return;
    }
    
    notificationShown = true;
    setTimeout(() => {
      notificationShown = false;
    }, NOTIFICATION_TIMEOUT);
    
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'Background Message Title';
    const notificationBody = payload.notification?.body || 'Background Message body.';
    
    // CRITICAL: Use unique tag to prevent duplicates
    // Use data.tag if provided, otherwise generate unique tag with timestamp
    const tag = payload.data?.tag || `trader-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notificationOptions = {
      body: notificationBody,
      icon: payload.notification?.icon || '/icon-192x192.png',
      badge: payload.notification?.badge || '/icon-96x96.png',
      tag: tag, // Unique tag prevents browser duplicates
      data: payload.data || {},
      requireInteraction: false,
      vibrate: [200, 100, 200] // Vibration pattern for mobile devices
    };

    console.log('🔔 [SERVICE WORKER] Showing notification:', notificationTitle, 'Tag:', tag);
    
    return self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('✅ [SERVICE WORKER] Notification displayed successfully');
      })
      .catch((error) => {
        console.error('❌ [SERVICE WORKER] Failed to show notification:', error);
        // Reset flag on error so retry can work
        notificationShown = false;
      });
  });
}

// Native push event listener (fallback if Firebase doesn't handle it)
self.addEventListener('push', function(event) {
  console.log('📬 [SERVICE WORKER] Native push event received');
  
  // Prevent duplicate notifications
  if (notificationShown) {
    console.log('⚠️ [SERVICE WORKER] Duplicate push ignored (native event)');
    return;
  }
  
  notificationShown = true;
  setTimeout(() => {
    notificationShown = false;
  }, NOTIFICATION_TIMEOUT);
  
  const data = event.data ? event.data.json() : {};
  const title = data.notification?.title || data.title || 'Notification';
  const body = data.notification?.body || data.body || '';
  const icon = data.notification?.icon || '/icon-192x192.png';
  const badge = data.notification?.badge || '/icon-96x96.png';
  
  // CRITICAL: Use unique tag to prevent duplicates
  const tag = data.data?.tag || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    data: data.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click received.');
  event.notification.close();
  
  const url = event.notification.data?.action_url || '/';
  
  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url || client.url === '/') {
          if ('focus' in client) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

const CACHE_NAME = 'traderweb-cache-v7';
const urlsToCache = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use add() instead of addAll() to handle failures gracefully
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err);
            return null;
          }))
        );
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // In dev mode (localhost:3000), completely bypass ALL requests
  // Don't intercept anything - let browser handle natively
  // Check if this is the dev server (localhost:3000)
  const isDevServer = (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && 
                      (url.port === '3000' || url.href.includes(':3000'));
  
  if (isDevServer) {
    // Don't intercept at all - let browser handle directly
    // This prevents service worker from interfering with Next.js dev server
    return;
  }
  
  // Completely bypass Next.js dev server assets, HMR, and webpack chunks
  // Don't intercept these at all - return early to let browser handle natively
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/_webpack/') ||
      url.pathname.includes('webpack') ||
      url.pathname.includes('chunks') ||
      url.pathname.includes('layout.css') ||
      url.pathname.includes('layout.js') ||
      url.pathname.includes('page.js') ||
      url.searchParams.has('v')) { // Cache-busting query params
    // Don't intercept at all - let browser handle directly
    return;
  }
  
  // Only cache GET requests for static assets
  if (event.request.method !== 'GET') {
    return; // Don't intercept non-GET requests
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Don't serve cached 404 responses
          if (response.status === 404) {
            return fetch(event.request);
          }
          return response;
        }
        return fetch(event.request).then((fetchResponse) => {
          // Don't cache 404 responses
          if (fetchResponse.status === 404) {
            return fetchResponse;
          }
          // Only cache successful responses
          const contentType = fetchResponse.headers.get('Content-Type') || '';
          const isHtml = contentType.includes('text/html');
          if (fetchResponse.ok && !isHtml) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
