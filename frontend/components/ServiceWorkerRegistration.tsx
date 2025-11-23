'use client'

import { useEffect } from 'react'

// Helper to send logs to NotificationHandler debug panel
function logToDebugPanel(message: string) {
  // Try to send via BroadcastChannel if available
  try {
    const channel = new BroadcastChannel('sw-log-channel')
    channel.postMessage({
      type: 'notification-log',
      message: `[SW Registration] ${message}`,
      timestamp: new Date().toISOString()
    })
    channel.close()
  } catch (e) {
    // Fallback to console
    console.log(`[SW Registration] ${message}`)
  }
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run on client side, after hydration
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logToDebugPanel('Service worker not supported in this browser')
      return
    }

    logToDebugPanel('Starting service worker registration...')

    // Register service worker (works in both dev and production)
    const registerSW = async () => {
      try {
        logToDebugPanel('Waiting for page load...')
        
        // Wait for page to be fully loaded and Next.js compilation complete
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(undefined)
          } else {
            window.addEventListener('load', () => resolve(undefined), { once: true })
          }
        })
        
        // Small delay to ensure Next.js is fully ready
        await new Promise(resolve => setTimeout(resolve, 200))
        
        logToDebugPanel('Checking existing service workers...')
        
        // CRITICAL: Unregister firebase-messaging-sw.js if it exists to prevent duplicates
        // Firebase SDK auto-registers it, but we want to use our main sw.js instead
        const registrations = await navigator.serviceWorker.getRegistrations()
        logToDebugPanel(`Found ${registrations.length} existing registration(s)`)
        
        for (const registration of registrations) {
          if (registration.scope.includes('firebase-messaging-sw.js') || 
              registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
            logToDebugPanel('⚠️ Unregistering firebase-messaging-sw.js')
            console.log('⚠️ Unregistering firebase-messaging-sw.js to prevent duplicates')
            await registration.unregister()
          }
        }
        
        logToDebugPanel('Registering /sw.js...')
        
        // Check if service worker file is accessible
        try {
          const swUrl = '/sw.js?v=' + Date.now()
          const response = await fetch(swUrl, { method: 'HEAD' })
          if (!response.ok) {
            logToDebugPanel(`⚠️ Service worker file not accessible: ${response.status} ${response.statusText}`)
            console.error(`Service worker file not accessible: ${response.status}`)
          } else {
            logToDebugPanel(`Service worker file accessible (${response.status})`)
          }
        } catch (fetchErr: any) {
          logToDebugPanel(`⚠️ Error checking SW file: ${fetchErr.message}`)
        }
        
        const registration = await navigator.serviceWorker.register('/sw.js?v=' + Date.now())
        logToDebugPanel(`✅ Registered successfully! Scope: ${registration.scope}`)
        console.log('Main Service Worker registered with scope: ', registration.scope)
        
        // Log service worker state
        if (registration.installing) {
          logToDebugPanel('Service worker is installing...')
        } else if (registration.waiting) {
          logToDebugPanel('Service worker is waiting...')
        } else if (registration.active) {
          logToDebugPanel(`Service worker is active: ${registration.active.scriptURL}`)
        }
        
        // Force update in dev mode to ensure latest version
        const isDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1'
        if (isDev && registration.update) {
          logToDebugPanel('Forcing update in dev mode...')
          registration.update()
        }
      } catch (err: any) {
        logToDebugPanel(`❌ Registration failed: ${err.message}`)
        console.log('Main Service Worker registration failed: ', err)
        console.error('Registration error details:', err)
      }
    }

    // Use requestIdleCallback to register when browser is idle (non-blocking)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(registerSW, { timeout: 2000 })
    } else {
      setTimeout(registerSW, 1000)
    }
  }, [])

  return null
}

