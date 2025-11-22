'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, CheckCircle, XCircle } from 'lucide-react'

const NotificationDemo: React.FC = () => {
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    // Check current permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      
      // Try to get token from localStorage (set by NotificationHandler)
      const storedToken = localStorage.getItem('fcm_token')
      if (storedToken) {
        setToken(storedToken)
      }
    }
  }, [])

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Notifications are not supported in this browser')
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    
    if (result === 'granted') {
      // Token should be registered by NotificationHandler component
      // Check console for the token or wait a moment
      setTimeout(() => {
        const storedToken = localStorage.getItem('fcm_token')
        if (storedToken) {
          setToken(storedToken)
        } else {
          alert('Token not found. Check browser console for FCM registration token.')
        }
      }, 1000)
    }
  }

  const sendTestNotification = async () => {
    if (!token) {
      alert('No device token available. Please grant notification permission first.')
      return
    }

    setSending(true)
    setLastResult(null)

    try {
      // Send notification via internal API route so server handles base URL
      const response = await fetch(`/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          app_id: 'trading-app', // Required: identifies which PWA
          title: '🎉 Test Notification',
          body: 'This is a test notification from your trading app!',
          data: {
            type: 'test',
            timestamp: new Date().toISOString(),
            accountId: '45073191'
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setLastResult({ success: true, message: `Notification sent successfully! ${result.message_id ? `(ID: ${result.message_id})` : ''}` })
      } else {
        setLastResult({ success: false, message: result.error || 'Failed to send notification' })
      }
    } catch (error: any) {
      setLastResult({ success: false, message: `Error: ${error.message}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto mt-8">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-6 h-6 text-blue-500" />
        <h2 className="text-xl font-bold">Push Notification Demo</h2>
      </div>

      <div className="space-y-4">
        {/* Permission Status */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Permission Status:</span>
            <span className={`px-2 py-1 rounded text-sm ${
              permission === 'granted' ? 'bg-green-100 text-green-800' :
              permission === 'denied' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {permission.toUpperCase()}
            </span>
          </div>
          
          {permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Request Notification Permission
            </button>
          )}
        </div>

        {/* Token Status */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Device Token:</span>
            {token ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>
          {token ? (
            <div className="mt-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                {token.substring(0, 50)}...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Token registered and ready!
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              No token available. Grant permission to get token.
            </p>
          )}
        </div>

        {/* Send Test Notification */}
        <button
          onClick={sendTestNotification}
          disabled={!token || sending}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            token && !sending
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
          {sending ? 'Sending...' : 'Send Test Notification'}
        </button>

        {/* Result */}
        {lastResult && (
          <div className={`p-4 rounded-lg ${
            lastResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`font-medium ${
                lastResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {lastResult.message}
              </span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium mb-2">How it works:</h3>
          <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
            <li>Grant notification permission</li>
            <li>Device token is automatically registered</li>
            <li>Click "Send Test Notification" to test</li>
            <li>Notification appears even when app is closed!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default NotificationDemo

