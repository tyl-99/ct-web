// Import Firebase scripts using importScripts (works in service workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Deduplication: Track recent notifications to prevent duplicates
let notificationShown = false;
const NOTIFICATION_TIMEOUT = 1000; // 1 second cooldown

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

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle incoming messages while the app is in the background
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [firebase-messaging-sw] Received background message:', payload);
  
  // Prevent duplicate notifications within timeout window
  if (notificationShown) {
    console.log('⚠️ [firebase-messaging-sw] Duplicate push ignored (within timeout window)');
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

  console.log('🔔 [firebase-messaging-sw] Showing notification:', notificationTitle, 'Tag:', tag);
  
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('✅ [firebase-messaging-sw] Notification displayed successfully');
    })
    .catch((error) => {
      console.error('❌ [firebase-messaging-sw] Failed to show notification:', error);
      // Reset flag on error so retry can work
      notificationShown = false;
    });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
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
