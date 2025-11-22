import { NextRequest, NextResponse } from 'next/server'

// POST /api/send-notification - Proxy to notification service to send test push
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, title, body: messageBody, data, app_id } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Device token is required' },
        { status: 400 }
      )
    }

    const notificationApiBaseUrl = process.env.NOTIFICATION_API_URL || process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:5001'
    const endpoint = `${notificationApiBaseUrl}/api/send-notification`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          app_id: app_id || 'trading-app',
          title: title || 'Notification',
          body: messageBody || 'You have a new notification.',
          data,
        }),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        return NextResponse.json(result)
      }

      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send notification' },
        { status: response.status }
      )
    } catch (error: any) {
      console.error(`❌ Error forwarding send-notification to ${notificationApiBaseUrl}:`, error)
      return NextResponse.json(
        {
          success: false,
          error: 'Notification service unavailable',
          details: error.message,
        },
        { status: 503 }
      )
    }
  } catch (error: any) {
    console.error('Error in /api/send-notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}


