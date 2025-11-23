import { NextRequest, NextResponse } from 'next/server'

const REDACTED = '***'

const formatToken = (token?: string | null) => {
  if (!token) return REDACTED
  return token.length > 16
    ? `${token.slice(0, 6)}...${token.slice(-4)}`
    : token
}

const formatString = (value?: string | null) => value || 'n/a'

const logPrefix = '[register-token]'

// POST /api/register-token - Register device token for push notifications
// Proxies to the notification service at NOTIFICATION_API_URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, app_id, user_id, device_type, platform } = body
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.ip ||
      'unknown'

    if (!token) {
      console.warn(
        `${logPrefix} Missing token from ${clientIp} (${userAgent})`,
      )
      return NextResponse.json(
        { success: false, error: 'Device token is required' },
        { status: 400 },
      )
    }

    // Forward to notification service
    const notificationApiBaseUrl =
      process.env.NOTIFICATION_API_URL ||
      process.env.NEXT_PUBLIC_NOTIFICATION_API_URL ||
      'http://localhost:5001'
    const notificationServiceUrl = `${notificationApiBaseUrl}/api/register-token`
    console.log(
      `${logPrefix} Forwarding token ${formatToken(token)} to ${notificationServiceUrl}`,
      {
        app_id: formatString(app_id),
        device_type: formatString(device_type),
        platform: formatString(platform),
        user_id: formatString(user_id),
        ip: clientIp,
        userAgent,
      },
    )
    
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
        console.log(
          `${logPrefix} Token ${formatToken(token)} registered successfully`,
          {
            app_id: result.app_id || app_id || 'trading-app',
            platform: formatString(platform),
            device_type: formatString(device_type),
            ip: clientIp,
          },
        )
        return NextResponse.json({
          success: true,
          message: 'Token registered successfully',
          app_id: result.app_id
        })
      } else {
        console.warn(
          `${logPrefix} Notification service rejected token ${formatToken(token)}`,
          {
            status: response.status,
            error: result.error,
            platform: formatString(platform),
            device_type: formatString(device_type),
            ip: clientIp,
          },
        )
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to register token' },
          { status: response.status }
        )
      }
    } catch (fetchError: any) {
      const notificationApiBaseUrl = process.env.NOTIFICATION_API_URL || process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:5001'
      console.error(`❌ Error forwarding to notification service at ${notificationApiBaseUrl}:`, fetchError)
      console.error(`💡 Make sure the notification service is running on ${notificationApiBaseUrl}`)
      console.error(`${logPrefix} Failed to forward token ${formatToken(token)}`, {
        platform: formatString(platform),
        device_type: formatString(device_type),
        ip: clientIp,
        message: fetchError?.message,
      })
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
    console.error(`${logPrefix} Unexpected error`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to register token', details: error.message },
      { status: 500 }
    )
  }
}

