import { NextRequest, NextResponse } from 'next/server'

type PairSummary = {
  total_trades: number
  wins: number
  losses: number
  total_pnl: number
  win_rate: number
  avg_pnl: number
}

function mergePairSummary(target: Record<string, PairSummary>, incoming: Record<string, PairSummary> | undefined) {
  if (!incoming) return
  for (const [pair, stats] of Object.entries(incoming)) {
    if (!target[pair]) {
      target[pair] = { ...stats }
    } else {
      const existing = target[pair]
      existing.total_trades += stats.total_trades || 0
      existing.wins += stats.wins || 0
      existing.losses += stats.losses || 0
      existing.total_pnl += stats.total_pnl || 0
      existing.win_rate = existing.total_trades
        ? (existing.wins / existing.total_trades) * 100
        : 0
      existing.avg_pnl = existing.total_trades
        ? existing.total_pnl / existing.total_trades
        : 0
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId || accountId === 'ALL') {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Fetch directly from account data API (not from Firebase)
    const accountDataApiBaseUrl = process.env.ACCOUNT_DATA_API_URL || process.env.NEXT_PUBLIC_ACCOUNT_DATA_API_URL || 'http://localhost:8000'
    const apiUrl = `${accountDataApiBaseUrl}/account-data?account_id=${accountId}`
    console.log(`📡 [API] Fetching data from account data API: ${apiUrl}`)
    
    try {
      const response = await fetch(apiUrl, {
        next: { revalidate: 0 }, // Don't cache
      })
      
      if (!response.ok) {
      console.error(`❌ [API] Account data API returned status ${response.status}`)
        return NextResponse.json(
          { error: `Failed to fetch data from API: ${response.status}` },
          { status: response.status }
        )
      }

      const accountData = await response.json()
      console.log(`✅ [API] Data received from account data API`)
      
      // Transform the API response to match the expected format
      const summaryStats = accountData.summary_stats || {}
      const tradesBySymbol = accountData.trades_by_symbol || {}
      const forexData = accountData.forex_data || {}

      return NextResponse.json({
        summaryStats: {
          ...summaryStats,
          total_pairs: Object.keys(tradesBySymbol).length,
          overall_win_rate: summaryStats.total_trades
            ? (summaryStats.total_wins / summaryStats.total_trades) * 100
            : 0
        },
        tradesData: tradesBySymbol,
        forexData: forexData
      })
    } catch (fetchError: any) {
      console.error(`❌ [API] Error fetching from localhost API:`, fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch data from API', details: fetchError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error loading data from API:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to load data', details: error.message },
      { status: 500 }
    )
  }
}

