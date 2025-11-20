'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run on client side, after hydration
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Register service worker (works in both dev and production)
    const registerSW = async () => {
      try {
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
        
        const registration = await navigator.serviceWorker.register('/sw.js?v=' + Date.now())
        console.log('Main Service Worker registered with scope: ', registration.scope)
        
        // Force update in dev mode to ensure latest version
        const isDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1'
        if (isDev && registration.update) {
          registration.update()
        }
      } catch (err) {
        console.log('Main Service Worker registration failed: ', err)
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

