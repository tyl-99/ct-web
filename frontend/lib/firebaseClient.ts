import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'
import { getMessaging, getToken, Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyBCkFVdozRjeHhKBNRwmz9ht0uEr8AmsTo',
  authDomain: 'my-trader-9e446.firebaseapp.com',
  projectId: 'my-trader-9e446',
  storageBucket: 'my-trader-9e446.firebasestorage.app',
  messagingSenderId: '936748321472',
  appId: '1:936748321472:web:68573ed6f74645a606bb25',
  measurementId: 'G-TMQDJY1BVM'
}

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()

let analytics: Analytics | null = null
let messaging: Messaging | null = null

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(firebaseApp)
    }
  })
  // Initialize Firebase Messaging
  // Check for service worker availability before initializing messaging
  // Firebase will automatically look for /firebase-messaging-sw.js in the public directory
  if ('serviceWorker' in navigator) {
    try {
      messaging = getMessaging(firebaseApp)
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error)
    }
  }
}

export { firebaseApp, analytics, messaging }

