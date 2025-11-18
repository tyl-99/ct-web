import { useEffect, useState } from 'react'

interface UseAutoRefreshOptions {
  interval?: number // in milliseconds
  enabled?: boolean
}

/**
 * Hook to automatically refresh data at specified intervals
 * Useful for keeping trading data up to date in development
 */
export function useAutoRefresh(
  refreshFunction: () => void | Promise<void>,
  options: UseAutoRefreshOptions = {}
) {
  const { interval = 30000, enabled = true } = options // Default 30 seconds
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(async () => {
      try {
        await refreshFunction()
        setLastRefresh(Date.now())
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [refreshFunction, interval, enabled])

  return {
    lastRefresh: new Date(lastRefresh),
    forceRefresh: async () => {
      try {
        await refreshFunction()
        setLastRefresh(Date.now())
      } catch (error) {
        console.error('Manual refresh failed:', error)
      }
    }
  }
}
