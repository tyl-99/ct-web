'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebaseClient' // Ensure this path is correct

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

// Module-level flag to prevent duplicate execution in React StrictMode
let notificationHandlerInitialized = false

const formatToken = (value: string | null) => {
  if (!value) {
    return 'N/A'
  }
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

const NotificationHandler: React.FC = () => {
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })
  const defaultDebugPanel = process.env.NEXT_PUBLIC_NOTIFICATION_DEBUG !== 'false'
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const debugLogsRef = useRef<string[]>([])
  const [allowDebugPanel, setAllowDebugPanel] = useState<boolean>(defaultDebugPanel)
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(defaultDebugPanel)

  const appendDebugLog = useCallback((message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString()
    let entry = `[${timestamp}] ${message}`

    if (typeof data !== 'undefined') {
      try {
        entry += ` ${typeof data === 'string' ? data : JSON.stringify(data)}`
      } catch {
        entry += ' [unserializable payload]'
      }
    }

    debugLogsRef.current = [...debugLogsRef.current, entry].slice(-120)
    setDebugLogs(debugLogsRef.current)

    if (typeof data !== 'undefined') {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get('debugNotifications') === 'true') {
      setAllowDebugPanel(true)
      setShowDebugPanel(true)
      return
    }

    const storedPreference = window.localStorage.getItem('show_notification_debug_panel')
    if (storedPreference === 'true') {
      setAllowDebugPanel(true)
      setShowDebugPanel(true)
    }
  }, [])

  const toggleDebugPanel = useCallback(() => {
    setAllowDebugPanel(true)
    setShowDebugPanel((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('show_notification_debug_panel', next ? 'true' : 'false')
      }
      return next
    })
  }, [])

  const clearDebugLogs = useCallback(() => {
    debugLogsRef.current = []
    setDebugLogs([])
  }, [])
  
  useEffect(() => {
    // Prevent duplicate execution in React StrictMode using module-level flag
    if (notificationHandlerInitialized) {
      appendDebugLog('Notification handler already initialized')
      return
    }
    notificationHandlerInitialized = true
    appendDebugLog('Notification handler initialized')
    if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !VAPID_KEY) {
      appendDebugLog('Notifications not supported or messaging/VAPID_KEY missing')
      return
    }

    const requestPermissionAndGetToken = async () => {
      // 1. Check if permission is already granted (don't request again)
      let currentPermission = Notification.permission
      
      // Only request permission if not already granted or denied
      if (currentPermission === 'default') {
        appendDebugLog('Requesting notification permission')
        currentPermission = await Notification.requestPermission()
      }
      
      setPermission(currentPermission)
      appendDebugLog(`Notification permission set to ${currentPermission}`)

      if (currentPermission === 'granted') {
        // Check if we already have a token stored
        const storedToken = localStorage.getItem('fcm_token')
        const registeredToken = localStorage.getItem('fcm_token_registered')
        
        // If we have a stored token and it's already registered, skip re-registration
        if (storedToken && registeredToken === storedToken) {
          appendDebugLog('Token already registered, skipping re-registration')
          setToken(storedToken)
          return
        }
        appendDebugLog('Notification permission granted, preparing to fetch token')
        try {
          // 2. Ensure we have an active service worker
          // Firebase Messaging needs an active service worker to register push subscriptions
          console.log('🔧 Checking service worker status...')
          
          // Get all registered service workers
          const registrations = await navigator.serviceWorker.getRegistrations()
          appendDebugLog(`Found ${registrations.length} service worker(s)`)
          
          // Find an active service worker (prefer main sw.js)
          let activeRegistration = registrations.find(reg => reg.active)
          
          if (!activeRegistration && registrations.length > 0) {
            // Wait for any service worker to become active
            appendDebugLog('Waiting for service worker to activate')
            activeRegistration = await navigator.serviceWorker.ready
          }
          
          if (!activeRegistration) {
            // Wait for main service worker
            appendDebugLog('Waiting for main service worker to become ready')
            activeRegistration = await navigator.serviceWorker.ready
          }
          
          if (activeRegistration?.active) {
            appendDebugLog('Active service worker found', activeRegistration.active.scriptURL)
          } else {
            console.warn('⚠️ No active service worker found, but continuing...')
            appendDebugLog('No active service worker found yet, continuing')
          }
          
          // 3. Wait for service worker to be fully ready before getting Firebase token
          // Firebase Messaging needs an active service worker to register push subscriptions
          appendDebugLog('Waiting for service worker readiness')
          const registration = await navigator.serviceWorker.ready
          appendDebugLog('Service worker ready', registration.scope)
          
          // Small delay to ensure service worker is fully activated
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verify service worker is active and ready
          if (!registration.active) {
            console.warn('⚠️ Service worker not active yet, waiting...')
            appendDebugLog('Service worker not active yet, retrying shortly')
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          
          // Check if push manager is available
          if (!registration.pushManager) {
            console.error('❌ Push Manager not available in service worker')
            appendDebugLog('Push Manager not available in service worker')
            throw new Error('Push Manager not available')
          }
          
          console.log('✅ Service worker active and push manager available')
          appendDebugLog('Service worker active and push manager available')
          
          // 4. Get Firebase registration token
          // Try multiple strategies to get the token
          console.log('🔧 Getting FCM token...')
          console.log('🔧 VAPID Key present:', !!VAPID_KEY)
          console.log('🔧 Service worker scope:', registration.scope)
          console.log('🔧 Service worker script:', registration.active?.scriptURL)
          
          let currentToken: string | null = null
          let lastError: any = null
          
          // Strategy 1: Explicitly use the main service worker (sw.js has Firebase Messaging)
          // This prevents Firebase from trying to auto-register firebase-messaging-sw.js
          try {
            console.log('📝 Strategy 1: Using main service worker (sw.js) with explicit registration...')
            appendDebugLog('Attempting to get token via main service worker (Strategy 1)')
            console.log('📝 Registration details:', {
              scope: registration.scope,
              active: !!registration.active,
              pushManager: !!registration.pushManager,
              scriptURL: registration.active?.scriptURL
            })
            
            // Verify VAPID key format (should be base64url, ~87 chars)
            if (VAPID_KEY) {
              console.log('📝 VAPID Key length:', VAPID_KEY.length, '(expected ~87)')
              console.log('📝 VAPID Key starts with:', VAPID_KEY.substring(0, 10) + '...')
            }
            
            currentToken = await getToken(messaging, { 
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: registration
            })
            console.log('✅ Token obtained using main service worker')
          } catch (error1: any) {
            console.warn('⚠️ Explicit registration failed:', error1)
            console.warn('⚠️ Error details:', {
              name: error1.name,
              message: error1.message,
              code: error1.code,
              stack: error1.stack?.substring(0, 200)
            })
            lastError = error1
            appendDebugLog('Strategy 1 failed', error1.message || 'Unknown error')
            
            // Strategy 2: Let Firebase auto-detect (it will look for firebase-messaging-sw.js)
            try {
              console.log('📝 Strategy 2: Letting Firebase auto-detect service worker...')
              appendDebugLog('Attempting to get token via auto-detect (Strategy 2)')
              await new Promise(resolve => setTimeout(resolve, 1000))
              currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY
              })
              console.log('✅ Token obtained using auto-detection')
              appendDebugLog('Token obtained using auto-detect strategy')
            } catch (error2: any) {
              console.warn('⚠️ Auto-detection failed:', error2.message)
              lastError = error2
              appendDebugLog('Strategy 2 failed', error2.message || 'Unknown error')
              
              // Strategy 3: Try again after a longer delay (service worker might still be initializing)
              try {
                console.log('📝 Strategy 3: Retrying after longer delay...')
                appendDebugLog('Attempting Strategy 3 after delay')
                await new Promise(resolve => setTimeout(resolve, 3000))
                currentToken = await getToken(messaging, { 
                  vapidKey: VAPID_KEY,
                  serviceWorkerRegistration: registration
                })
                console.log('✅ Token obtained on retry')
                appendDebugLog('Token obtained after retry (Strategy 3)')
              } catch (error3: any) {
                console.error('❌ All strategies failed')
                lastError = error3
                appendDebugLog('All token strategies failed', error3.message || 'Unknown error')
                
                // Provide detailed error information
                console.error('❌ Final error:', error3)
                if (error3.code === 'messaging/registration-failed' || error3.name === 'AbortError') {
                  console.error('❌ Push service registration failed. Possible causes:')
                  console.error('   1. Service worker needs to be unregistered and re-registered')
                  console.error('      → Open DevTools → Application → Service Workers → Unregister all')
                  console.error('      → Then refresh the page')
                  console.error('   2. Invalid or missing VAPID key')
                  console.error('   3. Service worker not properly initialized with Firebase')
                  console.error('   4. Browser push service unavailable or blocked')
                  console.error('   5. Network connectivity issues')
                  console.error('')
                  console.error('💡 Try this:')
                  console.error('   1. Open DevTools (F12)')
                  console.error('   2. Go to Application → Service Workers')
                  console.error('   3. Click "Unregister" for all service workers')
                  console.error('   4. Hard refresh the page (Ctrl+Shift+R)')
                }
                throw error3
              }
            }
          }
          
          if (currentToken) {
            setToken(currentToken)
            console.log('FCM registration token:', currentToken)
            appendDebugLog('FCM token generated', formatToken(currentToken))
            
            // Store token in localStorage for demo component
            if (typeof window !== 'undefined') {
              localStorage.setItem('fcm_token', currentToken)
            }

            // 3. Send the token directly to notification service at localhost:5001
            const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
            const platform = userAgent.includes('Chrome') ? 'chrome' : 
                           userAgent.includes('Safari') ? 'safari' : 
                           userAgent.includes('Firefox') ? 'firefox' : 'unknown'
            
            // Check if this token was already registered
            const registeredToken = localStorage.getItem('fcm_token_registered')
            
            if (currentToken === registeredToken) {
              console.log('✅ Token already registered, skipping API call')
              appendDebugLog('Token already registered with backend, skipping API call')
            } else {
              // Register new or changed token
              await fetch(`/api/register-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: currentToken,
                  app_id: 'trading-app', // This PWA's identifier
                  device_type: 'web',
                  platform: platform,
                  // user_id can be added later if you have user authentication
                }),
              })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    console.log('✅ Token successfully registered with notification service.', data)
                    appendDebugLog('Token registered with notification service')
                    // Mark token as registered
                    localStorage.setItem('fcm_token_registered', currentToken)
                  } else {
                    if (data.error === 'Notification service unavailable' || data.hint) {
                      console.warn('⚠️ Notification service is not reachable:', data.hint || 'Check NOTIFICATION_API_URL on the server')
                      console.warn('⚠️ Token registration skipped. Notifications will not work until the service responds.')
                      appendDebugLog('Notification service unavailable', data.hint || data.error)
                    } else {
                      console.error('❌ Failed to register token with notification service:', data)
                      appendDebugLog('Token registration failed', data.error || 'Unknown error')
                    }
                  }
                })
                .catch(error => {
                  console.error('❌ Error registering token with notification service:', error)
                  console.warn('⚠️ Token registration failed via /api/register-token (check server logs).')
                  appendDebugLog('Token registration request errored', error.message || 'Unknown error')
                })
            }
          } else {
            console.log('No registration token available. Request permission to generate one.')
            appendDebugLog('No registration token available yet')
          }
        } catch (error) {
          console.error('An error occurred while retrieving token:', error)
          appendDebugLog('Error while retrieving token', (error as Error)?.message || 'Unknown error')
        }
      } else {
        console.log('Notification permission denied or dismissed.')
        appendDebugLog('Notification permission denied or dismissed')
      }
    }

    requestPermissionAndGetToken()

    // 4. Handle incoming foreground messages
    console.log('🔧 [NOTIFICATION HANDLER] Setting up onMessage listener...')
    console.log('🔧 [NOTIFICATION HANDLER] Messaging instance:', messaging)
    console.log('🔧 [NOTIFICATION HANDLER] VAPID key:', VAPID_KEY ? 'SET' : 'NOT SET')
    appendDebugLog('Foreground message listener initialised')
    
    if (!messaging) {
      console.error('❌ [NOTIFICATION HANDLER] Messaging is null! Cannot set up listener.')
      return
    }
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📬 [FOREGROUND] ========== MESSAGE RECEIVED ==========')
      console.log('📬 [FOREGROUND] Full payload:', JSON.stringify(payload, null, 2))
      console.log('📬 [FOREGROUND] Notification title:', payload.notification?.title)
      console.log('📬 [FOREGROUND] Notification body:', payload.notification?.body)
      console.log('📬 [FOREGROUND] Data:', payload.data)
      
      // Display notification when app is in foreground
      if (Notification.permission === 'granted') {
        try {
          console.log('🔔 [FOREGROUND] Creating browser notification...')
          
          // Use unique tag with timestamp so each notification shows separately
          const uniqueTag = `trader-notification-${Date.now()}-${Math.random()}`
          
          const notification = new Notification(
            payload.notification?.title || 'New Message', 
            {
              body: payload.notification?.body || 'You have a new message.',
              icon: '/icon-192x192.png',
              badge: '/icon-96x96.png',
              tag: uniqueTag, // Unique tag so each notification shows separately
              data: payload.data || {},
              requireInteraction: true, // Keep it open until user interacts (prevents auto-close)
              silent: false // Make sure it's not silent (browser will use default sound)
            }
          )
          
          console.log('✅ [FOREGROUND] Notification object created:', notification)
          console.log('📋 [FOREGROUND] Notification properties:')
          console.log('   - Title:', notification.title)
          console.log('   - Body:', notification.body)
          console.log('   - Tag:', notification.tag)
          
          // Check if notification is actually showing
          notification.onshow = () => {
            console.log('✅✅✅ [FOREGROUND] Notification SHOW event fired - notification is visible!')
          }
          
          notification.onerror = (error) => {
            console.error('❌ [FOREGROUND] Notification ERROR event:', error)
          }
          
          notification.onclose = () => {
            console.log('🔔 [FOREGROUND] Notification CLOSED event')
          }
          
          // Handle notification click
          notification.onclick = () => {
            console.log('🔔 [FOREGROUND] Notification clicked!')
            window.focus()
            notification.close()
          }
          
          // Keep notification alive - don't auto-close
          // With requireInteraction: true, it will stay until user clicks or closes it
          // But add a long timeout as backup (30 seconds)
          setTimeout(() => {
            if (notification) {
              console.log('⏰ [FOREGROUND] Notification still exists after 30 seconds')
              // Don't auto-close - let user close it manually
            }
          }, 30000)
          
        } catch (error) {
          console.error('❌ [FOREGROUND] Failed to create notification:', error)
          console.error('❌ [FOREGROUND] Error details:', error.message, error.stack)
        }
      } else {
        console.warn('⚠️ [FOREGROUND] Notification permission not granted, current:', Notification.permission)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [messaging, VAPID_KEY, appendDebugLog])

  if (!allowDebugPanel && !showDebugPanel) {
    return null
  }

  const toggleButtonStyle = {
    position: 'fixed' as const,
    bottom: '1rem',
    right: showDebugPanel ? 'calc(1rem + 360px)' : '1rem',
    zIndex: 9998,
    padding: '0.45rem 0.75rem',
    fontSize: '0.75rem',
    borderRadius: '999px',
    backgroundColor: '#0f172a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(15,23,42,0.35)',
  }

  const panelStyle = {
    position: 'fixed' as const,
    bottom: '1rem',
    right: '1rem',
    width: 'min(92vw, 360px)',
    maxHeight: '60vh',
    backgroundColor: 'rgba(15,23,42,0.95)',
    color: '#f8fafc',
    borderRadius: '0.75rem',
    padding: '1rem',
    fontSize: '0.8rem',
    display: showDebugPanel ? 'flex' : 'none',
    flexDirection: 'column' as const,
    gap: '0.35rem',
    zIndex: 9999,
    boxShadow: '0 25px 50px rgba(15,15,15,0.45)',
    backdropFilter: 'blur(8px)',
  }

  const logContainerStyle = {
    overflowY: 'auto' as const,
    flex: 1,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.5rem',
    padding: '0.5rem',
    backgroundColor: 'rgba(15,23,42,0.75)',
  }

  return (
    <>
      {allowDebugPanel && !showDebugPanel && (
        <button style={toggleButtonStyle} onClick={toggleDebugPanel}>
          Show notification debug
        </button>
      )}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '0.85rem' }}>Notification Debug</strong>
            <span style={{ fontSize: '0.7rem', color: 'rgba(248,250,252,0.7)' }}>Permission: {permission}</span>
          </div>
          <button
            onClick={toggleDebugPanel}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.35rem',
              cursor: 'pointer',
            }}
          >
            {showDebugPanel ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.85)' }}>
          <div>Token: {formatToken(token)}</div>
          <div>Logs: {debugLogs.length}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.85)' }}>Recent events</span>
          <button
            onClick={clearDebugLogs}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              padding: '0.2rem 0.45rem',
              borderRadius: '0.35rem',
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>

        <div style={logContainerStyle}>
          {debugLogs.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No debug messages yet.</div>
          ) : (
            debugLogs
              .slice()
              .reverse()
              .map((logLine, index) => (
                <div
                  key={`${logLine}-${index}`}
                  style={{
                    borderBottom: index === debugLogs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '0.25rem',
                    marginBottom: '0.25rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {logLine}
                </div>
              ))
          )}
        </div>
      </div>
    </>
  )
}

// Helper function to clear FCM token storage (can be called from browser console)
export function clearFCMTokenStorage() {
  localStorage.removeItem('fcm_token')
  localStorage.removeItem('fcm_token_registered')
  console.log('✅ FCM tokens cleared from localStorage')
  console.log('💡 Refresh the page to re-register the token')
  return true
}

// Make it available globally for easy access from console
if (typeof window !== 'undefined') {
  (window as any).clearFCMToken = clearFCMTokenStorage
}

export default NotificationHandler
