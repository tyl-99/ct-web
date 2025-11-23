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
// Use BroadcastChannel for cross-service-worker coordination
let notificationShown = false;
let firebaseHandledNotification = false; // Track if Firebase handler already processed a notification
const NOTIFICATION_TIMEOUT = 1000; // 1 second cooldown
let broadcastChannel = null;

// Helper function to send logs to main thread for debug panel
function logToMainThread(message) {
  console.log(message);
  // Send to all clients (main thread)
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'notification-log',
        message: message,
        timestamp: new Date().toISOString()
      });
    });
  }).catch(err => {
    // Ignore errors if no clients
  });
}

try {
  broadcastChannel = new BroadcastChannel('notification-dedup');
  broadcastChannel.onmessage = (event) => {
    if (event.data.type === 'notification-shown') {
      logToMainThread(`[SW] Received broadcast: notification shown with tag ${event.data.tag}`);
      notificationShown = true;
      setTimeout(() => {
        notificationShown = false;
      }, NOTIFICATION_TIMEOUT);
    }
  };
} catch (e) {
  console.warn('BroadcastChannel not supported, using local deduplication only');
  logToMainThread('[SW] BroadcastChannel not supported');
}

// Handle incoming messages while the app is in the background
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const timestamp = new Date().toISOString();
    logToMainThread(`[SW] 📬 BACKGROUND MESSAGE at ${timestamp}`);
    logToMainThread(`[SW]    Title: ${payload.notification?.title || 'N/A'}`);
    logToMainThread(`[SW]    Body: ${payload.notification?.body || 'N/A'}`);
    
    console.log('🔔 [SERVICE WORKER] Received background message:', payload);
    console.log('🔔 [SERVICE WORKER] Notification title:', payload.notification?.title);
    console.log('🔔 [SERVICE WORKER] Notification body:', payload.notification?.body);
    
    // Generate unique tag for this notification
    const tag = payload.data?.tag || `trader-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logToMainThread(`[SW]    Tag: ${tag}`);
    
    // Check if another service worker already showed this notification
    if (notificationShown) {
      logToMainThread(`[SW] ⚠️ BLOCKED: Local flag (duplicate within ${NOTIFICATION_TIMEOUT}ms)`);
      console.log('⚠️ [SERVICE WORKER] Duplicate push ignored (local flag)');
      return;
    }
    
    logToMainThread(`[SW]    Checking existing notifications with tag...`);
    
    // CRITICAL: Check if a notification with this tag already exists
    // Also check by title/body to catch duplicates even if tags differ
    const notificationTitle = payload.notification?.title || 'Background Message Title';
    const notificationBody = payload.notification?.body || 'Background Message body.';
    
    return self.registration.getNotifications().then(allNotifications => {
      // Check by tag first
      const tagMatches = allNotifications.filter(n => n.tag === tag);
      logToMainThread(`[SW]    Found ${tagMatches.length} notification(s) with tag ${tag}`);
      
      if (tagMatches.length > 0) {
        logToMainThread(`[SW] ⚠️ BLOCKED: Tag ${tag} already exists`);
        console.log(`⚠️ [SERVICE WORKER] Notification with tag ${tag} already exists, ignoring duplicate`);
        return Promise.resolve();
      }
      
      // Also check by title/body (within last 2 seconds) to catch duplicates with different tags
      const recentNotifications = allNotifications.filter(n => {
        const timeDiff = Date.now() - (n.timestamp || 0);
        return timeDiff < 2000 && 
               n.title === notificationTitle && 
               n.body === notificationBody;
      });
      
      if (recentNotifications.length > 0) {
        logToMainThread(`[SW] ⚠️ BLOCKED: Recent notification with same title/body exists`);
        console.log(`⚠️ [SERVICE WORKER] Recent notification with same title/body already exists, ignoring duplicate`);
        return Promise.resolve();
      }
      
      logToMainThread(`[SW]    Total notifications: ${allNotifications.length}, tag matches: ${tagMatches.length}, recent matches: ${recentNotifications.length}`);
      
      logToMainThread(`[SW]    No duplicates, proceeding...`);
      
      // Broadcast to other service workers that we're showing this notification
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'notification-shown', tag: tag });
        logToMainThread(`[SW]    Broadcasted to other SWs`);
      }
      
      notificationShown = true;
      setTimeout(() => {
        notificationShown = false;
      }, NOTIFICATION_TIMEOUT);
      
      // notificationTitle and notificationBody already defined above
      const notificationOptions = {
        body: notificationBody,
        icon: payload.notification?.icon || '/icon-192x192.png',
        badge: payload.notification?.badge || '/icon-96x96.png',
        tag: tag, // Unique tag prevents browser duplicates
        data: payload.data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200] // Vibration pattern for mobile devices
      };

      logToMainThread(`[SW] 🔔 Showing: "${notificationTitle}"`);
      console.log('🔔 [SERVICE WORKER] Showing notification:', notificationTitle, 'Tag:', tag);
      
      // Mark that Firebase handler processed this notification
      firebaseHandledNotification = true;
      setTimeout(() => {
        firebaseHandledNotification = false;
      }, NOTIFICATION_TIMEOUT);
      
      return self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => {
          logToMainThread(`[SW] ✅ Displayed successfully`);
          console.log('✅ [SERVICE WORKER] Notification displayed successfully');
        })
        .catch((error) => {
          logToMainThread(`[SW] ❌ FAILED: ${error.message}`);
          console.error('❌ [SERVICE WORKER] Failed to show notification:', error);
          // Reset flags on error so retry can work
          notificationShown = false;
          firebaseHandledNotification = false;
        });
    }).catch(error => {
      logToMainThread(`[SW] ❌ ERROR checking: ${error.message}`);
      console.error('❌ [SERVICE WORKER] Error checking existing notifications:', error);
      // Continue anyway if check fails - show notification
      logToMainThread(`[SW]    Error occurred, showing anyway (fallback)`);
      notificationShown = true;
      setTimeout(() => {
        notificationShown = false;
      }, NOTIFICATION_TIMEOUT);
      
      const notificationTitle = payload.notification?.title || 'Background Message Title';
      const notificationBody = payload.notification?.body || 'Background Message body.';
      
      const notificationOptions = {
        body: notificationBody,
        icon: payload.notification?.icon || '/icon-192x192.png',
        badge: payload.notification?.badge || '/icon-96x96.png',
        tag: tag,
        data: payload.data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200]
      };

      logToMainThread(`[SW] 🔔 Showing (fallback): "${notificationTitle}"`);
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  });
}

// Native push event listener (fallback if Firebase doesn't handle it)
self.addEventListener('push', function(event) {
  const timestamp = new Date().toISOString();
  logToMainThread(`[SW] 📬 NATIVE PUSH EVENT at ${timestamp}`);
  
  console.log('📬 [SERVICE WORKER] Native push event received');
  
  // CRITICAL: If Firebase handler already processed this notification, skip native handler
  // This prevents duplicate notifications when both handlers fire
  if (firebaseHandledNotification) {
    logToMainThread(`[SW] ⚠️ BLOCKED: Firebase already handled this notification`);
    console.log('⚠️ [SERVICE WORKER] Native push ignored - Firebase handler already processed');
    return;
  }
  
  const data = event.data ? event.data.json() : {};
  // Use same tag generation logic as Firebase handler for consistency
  const tag = data.data?.tag || `trader-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logToMainThread(`[SW]    Tag: ${tag}`);
  
  // Prevent duplicate notifications
  if (notificationShown) {
    logToMainThread(`[SW] ⚠️ BLOCKED: Local flag (native push)`);
    console.log('⚠️ [SERVICE WORKER] Duplicate push ignored (native event, local flag)');
    return;
  }
  
  const title = data.notification?.title || data.title || 'Notification';
  const body = data.notification?.body || data.body || '';
  
  // CRITICAL: Check if a notification with this tag or same title/body already exists
  event.waitUntil(
    self.registration.getNotifications().then(allNotifications => {
      // Check by tag first
      const tagMatches = allNotifications.filter(n => n.tag === tag);
      logToMainThread(`[SW]    Found ${tagMatches.length} notification(s) with tag ${tag}`);
      
      if (tagMatches.length > 0) {
        logToMainThread(`[SW] ⚠️ BLOCKED: Tag ${tag} already exists (native)`);
        console.log(`⚠️ [SERVICE WORKER] Notification with tag ${tag} already exists (native), ignoring duplicate`);
        return Promise.resolve();
      }
      
      // Also check by title/body (within last 2 seconds) to catch duplicates with different tags
      const recentNotifications = allNotifications.filter(n => {
        const timeDiff = Date.now() - (n.timestamp || 0);
        return timeDiff < 2000 && 
               n.title === title && 
               n.body === body;
      });
      
      if (recentNotifications.length > 0) {
        logToMainThread(`[SW] ⚠️ BLOCKED: Recent notification with same title/body exists (native)`);
        console.log(`⚠️ [SERVICE WORKER] Recent notification with same title/body already exists (native), ignoring duplicate`);
        return Promise.resolve();
      }
      
      logToMainThread(`[SW]    Total: ${allNotifications.length}, tag matches: ${tagMatches.length}, recent matches: ${recentNotifications.length}`);
      logToMainThread(`[SW]    No duplicates, showing native push notification`);
      
      // Broadcast to other service workers that we're showing this notification
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'notification-shown', tag: tag });
        logToMainThread(`[SW]    Broadcasted to other SWs`);
      }
      
      notificationShown = true;
      setTimeout(() => {
        notificationShown = false;
      }, NOTIFICATION_TIMEOUT);
      
      const icon = data.notification?.icon || '/icon-192x192.png';
      const badge = data.notification?.badge || '/icon-96x96.png';
      
      const options = {
        body: body,
        icon: icon,
        badge: badge,
        tag: tag,
        data: data.data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200]
      };
      
      logToMainThread(`[SW] 🔔 Showing native: "${title}"`);
      return self.registration.showNotification(title, options);
    })
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
