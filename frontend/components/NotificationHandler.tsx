import { useEffect, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '@/lib/firebaseClient' // Ensure this path is correct

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

const NotificationHandler: React.FC = () => {
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !VAPID_KEY) {
      console.log("Notifications not supported or messaging/VAPID_KEY not available.")
      return
    }

    const requestPermissionAndGetToken = async () => {
      // 1. Request notification permission
      const currentPermission = await Notification.requestPermission()
      setPermission(currentPermission)

      if (currentPermission === 'granted') {
        console.log('Notification permission granted.')
        try {
          // 2. Get Firebase registration token
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY })
          if (currentToken) {
            setToken(currentToken)
            console.log('FCM registration token:', currentToken)

            // 3. Send the token to your backend
            await fetch('/api/register-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token: currentToken }),
            })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  console.log('Token successfully sent to backend.', data)
                } else {
                  console.error('Failed to send token to backend.', data)
                }
              })
              .catch(error => {
                console.error('Error sending token to backend:', error)
              })
          } else {
            console.log('No registration token available. Request permission to generate one.')
          }
        } catch (error) {
          console.error('An error occurred while retrieving token:', error)
        }
      } else {
        console.log('Notification permission denied or dismissed.')
      }
    }

    requestPermissionAndGetToken()

    // 4. Handle incoming foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground.', payload)
      // Optionally display a notification here
      new Notification(payload.notification?.title || 'New Message', {
        body: payload.notification?.body || 'You have a new message.',
        icon: '/icon-192x192.png',
        data: payload.data
      })
    })

    return () => {
      unsubscribe()
    }
  }, [messaging, VAPID_KEY])

  return null // This component doesn't render anything visible
}

export default NotificationHandler
