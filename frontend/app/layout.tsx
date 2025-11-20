import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import './globals.css'
import NotificationHandler from '@/components/NotificationHandler'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trader Backtest Dashboard',
  description: 'Comprehensive trading dashboard with candlestick charts and live stats',
  manifest: '/manifest.json', // Add manifest link
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F172A" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
          {children}
          <NotificationHandler />
          <ServiceWorkerRegistration />
        </div>
      </body>
    </html>
  )
} 