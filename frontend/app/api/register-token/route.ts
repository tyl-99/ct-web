import { NextRequest, NextResponse } from 'next/server'

// POST /api/register-token - Register device token for push notifications
// Proxies to the notification service at localhost:5001
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, app_id, user_id, device_type, platform } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Device token is required' },
        { status: 400 }
      )
    }

    // Forward to notification service
    const notificationApiBaseUrl = process.env.NOTIFICATION_API_URL || process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:5001'
    const notificationServiceUrl = `${notificationApiBaseUrl}/api/register-token`
    
    try {
      const response = await fetch(notificationServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          app_id: app_id || 'trading-app', // Default app_id for this PWA
          user_id: user_id || undefined,
          device_type: device_type || 'web',
          platform: platform || 'unknown', // Platform should be provided by client
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        return NextResponse.json({
          success: true,
          message: 'Token registered successfully',
          app_id: result.app_id
        })
      } else {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to register token' },
          { status: response.status }
        )
      }
    } catch (fetchError: any) {
      const notificationApiBaseUrl = process.env.NOTIFICATION_API_URL || process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:5001'
      console.error(`❌ Error forwarding to notification service at ${notificationApiBaseUrl}:`, fetchError)
      console.error(`💡 Make sure the notification service is running on ${notificationApiBaseUrl}`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Notification service unavailable', 
          details: fetchError.message,
          hint: 'Please start the notification service on port 5001'
        },
        { status: 503 }
      )
    }
  } catch (error: any) {
    console.error('Error registering token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register token', details: error.message },
      { status: 500 }
    )
  }
}

