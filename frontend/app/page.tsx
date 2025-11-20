'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Activity, PieChart, RefreshCw, AlertTriangle, Check } from 'lucide-react'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import DashboardHeader from './components/DashboardHeader'
import DashboardGrid from './components/DashboardGrid'
import DashboardCard from './components/DashboardCard'
import StatsOverview from './components/StatsOverview'
import TradesList from './components/TradesList'
import NotificationDemo from './components/NotificationDemo'
import { useAutoRefresh } from './hooks/useAutoRefresh'

interface SummaryStats {
  total_trades: number
  total_wins: number
  total_losses: number
  total_pnl: number
  overall_win_rate: number
  pairs_summary: Record<string, any>
}

interface TradeData {
  [key: string]: any[]
}

// Module-level flag to prevent duplicate execution in React StrictMode
let hasInitialized = false

export default function Home() {
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [tradesData, setTradesData] = useState<TradeData | null>(null)
  const [selectedPair, setSelectedPair] = useState<string>('ALL')
  const [selectedTrade, setSelectedTrade] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'ALL' | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountNames, setAccountNames] = useState<Record<string, string>>({})
  const [fetchingData, setFetchingData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null)
  const [hasAttemptedAutoFetch, setHasAttemptedAutoFetch] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Track if initial load is complete to prevent duplicate calls
  const initialLoadComplete = React.useRef(false)
  const previousAccountId = React.useRef<string | null>(null)

  // Load accounts metadata - no dependencies to avoid circular calls
  const loadAccounts = useCallback(async () => {
    try {
      // First, get all configured accounts from API
      const accountsResponse = await fetch('/api/accounts', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (!accountsResponse.ok) {
        throw new Error('Failed to fetch accounts')
      }
      const apiData = await accountsResponse.json()
      const configuredAccounts = apiData.accounts?.filter((acc: any) => acc.enabled) || []
      
      if (configuredAccounts.length === 0) {
        setAccounts([])
        setAccountNames({})
        return { accounts: [], accountId: null }
      }

      // Build account map - just use all enabled accounts
      const accountMap: Record<string, string> = {}
      configuredAccounts.forEach((acc: any) => {
        accountMap[acc.id] = acc.name || `Account ${acc.id}`
      })

      // Return all enabled accounts
      const accountsToReturn = configuredAccounts.map((acc: any) => ({
        account_id: acc.id,
        name: acc.name || `Account ${acc.id}`
      }))

      setAccounts(accountsToReturn)
      setAccountNames(accountMap)
      
      // Use first account as default
      const firstAccountId = accountsToReturn[0]?.account_id || null
      
      console.log('loadAccounts returning:', { 
        firstAccountId,
        accountCount: accountsToReturn.length
      })
      
      return { 
        accounts: accountsToReturn, 
        accountId: firstAccountId
      }
    } catch (error) {
      console.log('Error loading accounts:', error)
      setAccounts([])
      setAccountNames({})
      return { accounts: [], accountId: null }
    }
  }, []) // NO dependencies - pure fetch function

  const triggerDataFetch = useCallback(async () => {
    try {
      setFetchError(null)
      setFetchSuccess(null)
      setFetchingData(true)
      setHasAttemptedAutoFetch(true) // Mark as attempted
      
      const accountIdToFetch = selectedAccountId && selectedAccountId !== 'ALL' ? selectedAccountId : null
      const response = await fetch('/api/accounts/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountIdToFetch ? { account_id: accountIdToFetch } : {})
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to trigger data fetch')
      }

      setFetchSuccess(result.message || 'Data fetch started. This may take a moment…')
      // Wait a bit longer for data to be processed, then reload
      setTimeout(() => {
        // Reload the page to get fresh data
        window.location.reload()
      }, 4000)
    } catch (error: any) {
      console.error('Failed to trigger data fetch:', error)
      setFetchError(error.message || 'Failed to trigger data fetch')
      setFetchingData(false)
      setHasAttemptedAutoFetch(false) // Allow retry on error
    }
  }, [selectedAccountId]) // Removed circular dependencies

  // Auto-refresh functionality - uses selectedAccountId from state
  const loadData = useCallback(async (accountIdOverride?: string) => {
    setIsRefreshing(true)
    setLoading(true)
    try {
      // Use override if provided, otherwise use selectedAccountId from state
      // NEVER use 'ALL' - always use a specific account ID
      let accountQuery = accountIdOverride || selectedAccountId
      
      // If no account or 'ALL', use first account from accounts list
      if (!accountQuery || accountQuery === 'ALL') {
        if (accounts.length === 0) {
          console.log('No accounts available')
          setSummaryStats(null)
          setTradesData(null)
          setLoading(false)
          setIsRefreshing(false)
          return
        }
        accountQuery = accounts[0]?.account_id || null
      }
      
      // If still no valid account, return early
      if (!accountQuery) {
        console.log('No valid account found')
        setSummaryStats(null)
        setTradesData(null)
        setLoading(false)
        setIsRefreshing(false)
        return
      }

      console.log('📡 Fetching data for account:', accountQuery, {
        accountIdOverride,
        selectedAccountId,
        accountsCount: accounts.length,
        timestamp: new Date().toISOString()
      })

      const dataResponse = await fetch(`/api/data?accountId=${accountQuery}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      if (!dataResponse.ok) {
        const errorData = await dataResponse.json().catch(() => ({}))
        console.error('❌ API Error:', dataResponse.status, errorData)
        throw new Error(errorData.error || `Failed to load trading data: ${dataResponse.status}`)
      }
      
      const data = await dataResponse.json()
      
      const hasData = !!(data.summaryStats && Object.keys(data.tradesData || {}).length > 0)
      
      console.log(hasData ? '✅ Data received from API:' : '⚠️ Empty data received from API:', {
        accountId: accountQuery,
        hasSummaryStats: !!data.summaryStats,
        tradesDataKeys: Object.keys(data.tradesData || {}),
        tradesDataCount: Object.values(data.tradesData || {}).reduce((sum: number, arr: any) => 
          sum + (Array.isArray(arr) ? arr.length : 0), 0),
        summaryStats: data.summaryStats ? {
          total_trades: data.summaryStats.total_trades,
          total_pnl: data.summaryStats.total_pnl
        } : null,
        timestamp: new Date().toISOString()
      })

       // Check if account has no data (just check if data exists)
      if (!data.summaryStats && Object.keys(data.tradesData || {}).length === 0) {
        console.log('⚠️ No data found in Firebase for account:', accountQuery, 'Auto-fetch attempted:', hasAttemptedAutoFetch)
        
        // Auto-fetch data if account exists but has no data, and we haven't tried yet
        if (accounts.length > 0 && accountQuery && accountQuery !== 'ALL' && !hasAttemptedAutoFetch) {
          console.log('Account exists but no data in Firebase. Auto-fetching from cTrader...')
          setHasAttemptedAutoFetch(true)
          setLoading(true) // Keep loading state while fetching
          setIsRefreshing(true)
          
          // Automatically trigger data fetch
          try {
            setFetchSuccess('Fetching data from cTrader and processing...')
            const fetchResponse = await fetch('/api/accounts/fetch-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ account_id: accountQuery })
            })
            const fetchResult = await fetchResponse.json().catch(() => ({}))
            
            if (fetchResponse.ok && fetchResult.success) {
              setFetchSuccess('Processing data and uploading to Firebase. Please wait...')
              
              // Wait and retry checking Firebase with exponential backoff
              const checkForData = async (attempt: number = 1): Promise<void> => {
                const delay = attempt === 1 ? 3000 : Math.min(2000 * attempt, 8000) // 3s, 4s, 6s, 8s
                await new Promise(resolve => setTimeout(resolve, delay))
                
                console.log(`[${attempt}/5] Checking Firebase for data...`)
                try {
                  const checkResponse = await fetch(`/api/data?accountId=${accountQuery}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                  })
                  const checkData = await checkResponse.json()
                  
                  if (checkData.summaryStats || Object.keys(checkData.tradesData || {}).length > 0) {
                    console.log('✅ Data found in Firebase! Loading dashboard...')
                    // Set data directly instead of calling loadData() again
                    setSummaryStats(checkData.summaryStats)
                    setTradesData(checkData.tradesData)
                    setFetchSuccess(null)
                    setIsRefreshing(false)
                    setLoading(false)
                    return
                  }
                  
                  // If not found and haven't exceeded max attempts, try again
                  if (attempt < 5) {
                    setFetchSuccess(`Processing and uploading to Firebase... (${attempt}/5)`)
                    return checkForData(attempt + 1)
                  }
                  
                  // Max attempts reached
                  console.log('⚠️ Max retry attempts reached. Data may still be processing.')
                  setFetchSuccess('Data processing may take longer. Please refresh in a moment or click "Fetch Data" again.')
                  setIsRefreshing(false)
                  setLoading(false)
                } catch (checkError) {
                  console.error('Error checking for data:', checkError)
                  if (attempt < 5) {
                    return checkForData(attempt + 1)
                  }
                  setFetchError('Error checking Firebase. Please try again.')
                  setIsRefreshing(false)
                  setLoading(false)
                }
              }
              
              // Start checking after initial delay
              checkForData(1)
              return // Keep loading state
            } else {
              setFetchError(fetchResult.error || 'Failed to auto-fetch data')
              setHasAttemptedAutoFetch(false) // Allow retry
              setLoading(false)
              setIsRefreshing(false)
            }
          } catch (autoFetchError: any) {
            console.error('Auto-fetch error:', autoFetchError)
            setFetchError('Failed to auto-fetch data. Please click "Fetch Data" manually.')
            setHasAttemptedAutoFetch(false) // Allow retry
            setLoading(false)
            setIsRefreshing(false)
          }
          
          // Keep loading state while fetching
          return
        }
        
        // Only show "no data" message if we've already tried fetching OR if auto-fetch is disabled
        setSummaryStats(null)
        setTradesData({})
        setLoading(false)
        setIsRefreshing(false)
        return
      }

      // Data exists, set it
      setSummaryStats(data.summaryStats)
      setTradesData(data.tradesData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setSummaryStats(null)
      setTradesData(null)
      setLoading(false)
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedAccountId, accounts, hasAttemptedAutoFetch]) // Don't include loadAccounts to avoid circular calls

  // Auto-refresh disabled - use manual refresh button instead
  // Note: In development mode, React StrictMode causes components to render twice,
  // which is why you see duplicate logs. This is expected behavior and helps catch bugs.
  // It only happens in development, not in production.
  const isDevelopment = process.env.NODE_ENV === 'development'
  const { lastRefresh, forceRefresh } = useAutoRefresh(loadData, {
    interval: 120000, // 2 minutes (120000ms) - not used when disabled
    enabled: false // Disabled - use manual refresh button instead
  })

  // Initial load - only run once on mount (even with StrictMode)
  useEffect(() => {
    // Prevent duplicate execution in React StrictMode using module-level flag
    if (hasInitialized || initialLoadComplete.current) {
      return
    }
    
    // Mark as started immediately to prevent duplicate execution
    hasInitialized = true
    initialLoadComplete.current = true
    
    // Set loading to true immediately
    setLoading(true)
    
    // Load accounts first, then trigger data processor, then load data with the correct account ID
    const initializeData = async () => {
      try {
        console.log('🚀 Initial load starting...')
        const { accounts: accountList, accountId } = await loadAccounts()
        console.log('✅ Accounts loaded:', accountList.length, 'First account:', accountId)
        
        if (accountList.length > 0 && accountId) {
          // Trigger data processor in background (non-blocking) - don't wait for it
          console.log('🔄 Triggering data processor to fetch fresh data (background)...')
          fetch('/api/accounts/fetch-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId })
          })
            .then(response => {
              if (response.ok) {
                return response.json()
              } else {
                console.warn('⚠️ Data processor trigger returned:', response.status)
                return null
              }
            })
            .then(result => {
              if (result) {
                console.log('✅ Data processor triggered successfully:', result.message || 'Success')
              }
            })
            .catch(error => {
              console.warn('⚠️ Error triggering data processor (non-blocking):', error.message || error)
            })
          
          // Set the account ID in state
          setSelectedAccountId(accountId)
          
          // Load data immediately - don't wait for data processor
          console.log('📊 Loading data for account:', accountId)
          await loadData(accountId) // Pass accountId directly to avoid race condition
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Initial load error:', error)
        setLoading(false)
      }
    }
    
    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run on mount

  // Reload data when selectedAccountId changes (user switches accounts)
  useEffect(() => {
    // Skip if initial load not complete
    if (!initialLoadComplete.current) {
      return
    }
    
    // Skip if no valid account
    if (!selectedAccountId || selectedAccountId === 'ALL') {
      previousAccountId.current = selectedAccountId
      return
    }
    
    // Only reload if account actually changed AND we've already done the initial load
    if (previousAccountId.current !== null && previousAccountId.current !== selectedAccountId) {
      console.log('🔄 Account changed from', previousAccountId.current, 'to', selectedAccountId, '- triggering data processor and reloading data')
      
      // Trigger data processor for the new account
      const triggerAndLoad = async () => {
        try {
          const fetchResponse = await fetch('/api/accounts/fetch-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: selectedAccountId })
          })
          
          if (fetchResponse.ok) {
            console.log('✅ Data processor triggered for account:', selectedAccountId)
            // Wait a bit for data to be processed
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } catch (fetchError) {
          console.warn('⚠️ Error triggering data processor:', fetchError, '- continuing with existing data')
        }
        
        // Load data after triggering processor
        loadData(selectedAccountId)
      }
      
      triggerAndLoad()
    }
    
    previousAccountId.current = selectedAccountId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId])

  // Mobile detection - must be at top level with other hooks
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      const isMobileDevice = width < 1024
      setIsMobile(isMobileDevice)
      // Also add a class to body for CSS targeting
      if (isMobileDevice) {
        document.body.classList.add('mobile-device')
        document.body.classList.remove('desktop-device')
      } else {
        document.body.classList.add('desktop-device')
        document.body.classList.remove('mobile-device')
      }
    }
    // Check immediately
    checkMobile()
    // Check on resize
    window.addEventListener('resize', checkMobile)
    // Check on orientation change (mobile)
    window.addEventListener('orientationchange', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [])

  // Show loading state
  if (loading || (hasAttemptedAutoFetch && (fetchingData || fetchSuccess))) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="glass p-8 rounded-2xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            <div className="text-center">
              <span className="text-white text-lg block" suppressHydrationWarning>
                {hasAttemptedAutoFetch ? 'Fetching data from cTrader...' : 'Loading trading data from Firebase...'}
              </span>
              {fetchSuccess && (
                <span className="text-green-400 text-sm block mt-2" suppressHydrationWarning>{fetchSuccess}</span>
              )}
              {fetchError && (
                <span className="text-red-400 text-sm block mt-2" suppressHydrationWarning>{fetchError}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!summaryStats || !tradesData || Object.keys(tradesData).length === 0) {
    const isAutoFetching = hasAttemptedAutoFetch && (fetchingData || fetchSuccess)
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center max-w-md">
          {isAutoFetching ? (
            <>
              <div className="text-blue-400 mb-4">
                <RefreshCw className="w-12 h-12 mx-auto mb-2 animate-spin" />
                <h2 className="text-xl font-bold">Fetching Trading Data</h2>
              </div>
              <p className="text-white/80 mb-6">
                {fetchSuccess || 'Automatically fetching data from cTrader. Please wait...'}
              </p>
            </>
          ) : (
            <>
              <div className="text-yellow-400 mb-4">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                <h2 className="text-xl font-bold">No Trading Data Available</h2>
              </div>
              <p className="text-white/80 mb-6">
                {selectedAccountId && selectedAccountId !== 'ALL'
                  ? `Account ${selectedAccountId} doesn't have any trading data yet.`
                  : 'No trading data found for any accounts.'}
              </p>
              <button
                onClick={triggerDataFetch}
                disabled={fetchingData}
                className="px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors disabled:opacity-50 touch-manipulation min-h-[44px]"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'white'
                }}
              >
                {fetchingData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Fetch Data from cTrader
                  </>
                )}
              </button>
            </>
          )}
          {fetchSuccess && !isAutoFetching && (
            <p className="text-green-400 mt-4 text-sm">{fetchSuccess}</p>
          )}
          {fetchError && (
            <p className="text-red-400 mt-4 text-sm">{fetchError}</p>
          )}
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    if (!summaryStats || !tradesData) return null

    const totalTradesAll = Object.values(tradesData).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    const tradesForTable = selectedPair === 'ALL'
      ? Object.values(tradesData).flat()
      : (tradesData[selectedPair] || [])
    const tradesForView = selectedPair === 'ALL'
      ? Object.values(tradesData).flat()
      : (tradesData[selectedPair] || [])

    switch (activeTab) {
      case 'overview':
        return (
          <>
            <StatsOverview stats={summaryStats} />
            <div className="mt-8">
              <DashboardGrid>
                <DashboardCard title="Quick Stats" icon={BarChart3} className="xl:col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-400">{summaryStats.total_trades}</div>
                      <div className="text-white/60 text-sm">Total Trades</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-400">{summaryStats.total_wins}</div>
                      <div className="text-white/60 text-sm">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-danger-400">{summaryStats.total_losses}</div>
                      <div className="text-white/60 text-sm">Losses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-400">{summaryStats.overall_win_rate.toFixed(1)}%</div>
                      <div className="text-white/60 text-sm">Win Rate</div>
                    </div>
                  </div>
                </DashboardCard>
                <DashboardCard title="P&L Overview" icon={DollarSign}>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${summaryStats.total_pnl >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                      ${summaryStats.total_pnl.toFixed(2)}
                    </div>
                    <div className="text-white/60 text-sm mt-2">Total Profit & Loss</div>
                  </div>
                </DashboardCard>
              </DashboardGrid>
            </div>
          </>
        )
      case 'trades':
        return (
          <TradesList 
            trades={tradesForTable}
            selectedTrade={selectedTrade}
            onTradeSelect={setSelectedTrade}
            totalTradesAll={totalTradesAll}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={(accountId) => {
              setSelectedAccountId(accountId)
              // Reload data when account changes
              setTimeout(() => loadData(), 100)
            }}
            onTradeClick={(trade) => {
              setSelectedTrade(trade)
            }}
          />
        )
      case 'performance':
        return (
          <DashboardCard title="Performance Metrics" icon={PieChart} fullWidth>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(summaryStats.pairs_summary).map(([pair, pairStats]: [string, any]) => (
                <div key={pair} className="card p-4">
                  <h4 className="font-semibold text-white mb-3">{pair.replace('_', '/')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/60">Trades:</span>
                      <span className="text-white">{pairStats.total_trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Win Rate:</span>
                      <span className="text-white">{pairStats.win_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">P&L:</span>
                      <span className={pairStats.total_pnl >= 0 ? 'text-success-400' : 'text-danger-400'}>
                        ${pairStats.total_pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        )
      case 'risk':
        return (
          <DashboardCard title="Risk Management" icon={Target} fullWidth>
            <div className="text-center py-12 text-white/60">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Risk Management Dashboard</p>
              <p className="text-sm">Coming Soon...</p>
            </div>
          </DashboardCard>
        )
      case 'alerts':
        return (
          <DashboardCard title="Trading Alerts" icon={Activity} fullWidth>
            <div className="text-center py-12 text-white/60">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Trading Alerts</p>
              <p className="text-sm">Coming Soon...</p>
            </div>
          </DashboardCard>
        )
      case 'settings':
        return (
          <DashboardCard title="Dashboard Settings" icon={Activity} fullWidth>
            <div className="text-center py-12 text-white/60">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Settings Panel</p>
              <p className="text-sm">Coming Soon...</p>
          </div>
          </DashboardCard>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Notification Demo Component - Shows how push notifications work */}
      <div className="fixed bottom-4 right-4 z-50 max-w-sm hidden lg:block">
        {/* NotificationDemo - Hidden for now but kept for future use */}
        <div style={{ display: 'none' }}>
          <NotificationDemo />
        </div>
      </div>
      
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isMobile={isMobile} />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-64 px-4 py-4 lg:p-6 pb-20 lg:pb-6 pt-4 lg:pt-8" style={{ paddingTop: 'max(env(safe-area-inset-top, 0), 1rem)' }}>
        <DashboardHeader 
          title="Trading Dashboard" 
          subtitle={isDevelopment ? 
            `Real-time trading performance and analytics (Auto-refresh: ${isDevelopment ? 'ON' : 'OFF'})` :
            "Real-time trading performance and analytics"
          }
          onRefresh={forceRefresh}
          isRefreshing={isRefreshing}
        />
        
        {(fetchError || fetchSuccess) && (
          <div className="mt-6 mb-6 space-y-3">
            {fetchError && (
              <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-100 text-sm flex items-start gap-3">
                <Activity className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-semibold">Data fetch failed</p>
                  <p>{fetchError}</p>
                </div>
              </div>
            )}
            {fetchSuccess && (
              <div className="p-4 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-100 text-sm flex items-start gap-3">
                <Check className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-semibold">Fetching started</p>
                  <p>{fetchSuccess}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 lg:mt-6">
          {renderTabContent()}
        </div>
        
        {/* Bottom Navigation - Mobile Only */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Trade Details Sidebar */}
        {selectedTrade && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed right-4 lg:right-6 top-4 lg:top-6 w-full max-w-sm lg:w-80 p-4 lg:p-6 rounded-2xl z-40 border mb-20 lg:mb-0"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Trade Details</h3>
              <button
                onClick={() => setSelectedTrade(null)}
                className="hover:text-white transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                <div 
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">Direction</div>
                      <div className={`text-lg font-bold ${
                    selectedTrade['Buy/Sell'] === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {selectedTrade['Buy/Sell']}
                      </div>
                    </div>
                <div 
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">Result</div>
                      <div className={`text-lg font-bold ${
                    selectedTrade['Win/Lose'] === 'WIN' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {selectedTrade['Win/Lose']}
                      </div>
                    </div>
                  </div>
                  
              <div 
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--background-tertiary)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <div style={{ color: 'var(--text-muted)' }} className="text-sm">P&L</div>
                    <div className={`text-2xl font-bold ${
                  selectedTrade.PnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${selectedTrade.PnL}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                <div 
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">Entry Price</div>
                  <div className="text-white font-mono text-sm">{selectedTrade['Entry Price']}</div>
                </div>
                <div 
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">Lots</div>
                  <div className="text-white font-mono text-sm">{selectedTrade.Lots}</div>
                </div>
          </div>
        </div>
          </motion.div>
        )}
      </div>
    </div>
  )
} 