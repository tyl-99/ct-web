import { getMessaging } from "firebase/messaging/sw";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: 'AIzaSyBCkFVdozRjeHhKBNRwmz9ht0uEr8AmsTo',
  authDomain: 'my-trader-9e446.firebaseapp.com',
  projectId: 'my-trader-9e446',
  storageBucket: 'my-trader-9e446.firebasestorage.app',
  messagingSenderId: '936748321472',
  appId: '1:936748321472:web:68573ed6f74645a606bb25',
  measurementId: 'G-TMQDJY1BVM'
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

// Handle incoming messages while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Background Message Title';
  const notificationOptions = {
    body: payload.notification?.body || 'Background Message body.',
    icon: '/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add the VAPID key for Firebase Messaging
// Make sure this matches the NEXT_PUBLIC_FIREBASE_VAPID_KEY in next.config.js
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed, resubscribing...');
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BEirJUyHHEE0th0-6V0T8vQAlOGiyOTFXvt38xzgZW8XtABz7VloUCYNvJQ77oE3ZBqXbs3WqIK_u41bTfBIxQQ'
    })
    .then(function(newSubscription) {
      // TODO: Send newSubscription to backend
      console.log('New subscription obtained:', newSubscription);
    })
  );
});
