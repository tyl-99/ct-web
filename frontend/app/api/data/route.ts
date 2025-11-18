import { NextRequest, NextResponse } from 'next/server'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getFirestore } from '@/lib/firebaseAdmin'

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

    let db
    try {
      db = getFirestore()
    } catch (firebaseError: any) {
      console.error('Firebase initialization error:', firebaseError)
      return NextResponse.json(
        { error: 'Database connection failed', details: firebaseError.message },
        { status: 500 }
      )
    }

    let accountDocs: QueryDocumentSnapshot<DocumentData>[] = []

    if (accountId && accountId !== 'ALL') {
      console.log(`🔍 Searching for account ${accountId} in Firebase...`)
      
      // Try both string and number formats for account ID
      let doc = await db.collection('accounts').doc(accountId).get()
      console.log(`   First attempt (${accountId}): ${doc.exists ? 'FOUND' : 'NOT FOUND'}`)
      
      if (!doc.exists) {
        // Try as number if accountId is a string number
        const numId = parseInt(accountId, 10)
        if (!isNaN(numId) && numId.toString() === accountId) {
          doc = await db.collection('accounts').doc(numId.toString()).get()
          console.log(`   Second attempt (${numId}): ${doc.exists ? 'FOUND' : 'NOT FOUND'}`)
        }
      }
      
      if (!doc.exists) {
        // Account doesn't exist in Firestore - List all accounts for debugging
        console.log(`❌ Account ${accountId} not found in Firestore`)
        const allAccounts = await db.collection('accounts').listDocuments()
        const accountIds = allAccounts.map(d => d.id)
        console.log(`   Available accounts in Firebase: [${accountIds.join(', ')}]`)
        return NextResponse.json({ 
          summaryStats: null, 
          tradesData: {}, 
          forexData: {},
          debug: {
            accountId,
            availableAccounts: accountIds,
            message: 'Account document not found'
          }
        })
      }
      
      console.log(`✅ Account document found: ${doc.id}`)
      
      // Check if data exists by looking for summary collection
      const summarySnap = await doc.ref.collection('summary').doc('latest').get()
      console.log(`   Checking summary/latest: ${summarySnap.exists ? 'EXISTS' : 'NOT FOUND'}`)
      
      if (!summarySnap.exists) {
        // Account exists but no data yet
        console.log(`⚠️ Account ${accountId} exists but summary/latest document not found`)
        console.log(`   Document path: accounts/${doc.id}/summary/latest`)
        return NextResponse.json({ 
          summaryStats: null, 
          tradesData: {}, 
          forexData: {},
          debug: {
            accountId,
            documentExists: true,
            summaryExists: false,
            message: 'Account exists but no summary data'
          }
        })
      }
      
      console.log(`✅ Found complete data for account ${accountId}`)
      accountDocs = [doc]
    } else {
      // Get all accounts and filter those with data
      try {
        const allAccounts = await db.collection('accounts').get()
        accountDocs = []
        for (const doc of allAccounts.docs) {
          try {
            const summarySnap = await doc.reference.collection('summary').doc('latest').get()
            if (summarySnap.exists) {
              accountDocs.push(doc)
            }
          } catch (docError: any) {
            console.error(`Error checking account ${doc.id}:`, docError)
            // Continue with other accounts
          }
        }
      } catch (collectionError: any) {
        console.error('Error fetching accounts collection:', collectionError)
        return NextResponse.json(
          { error: 'Failed to fetch accounts', details: collectionError.message },
          { status: 500 }
        )
      }
    }

    if (!accountDocs.length) {
      return NextResponse.json({ summaryStats: null, tradesData: {}, forexData: {} })
    }

    const aggregatedSummary: any = {
      total_pairs: 0,
      total_trades: 0,
      total_wins: 0,
      total_losses: 0,
      total_pnl: 0,
      overall_win_rate: 0,
      pairs_summary: {},
      account_info: {},
      open_positions: [],
      last_updated: new Date().toISOString()
    }
    const aggregatedTrades: Record<string, any[]> = {}
    const aggregatedForex: Record<string, any> = {}

    for (const doc of accountDocs) {
      const accountId = doc.id
      const summarySnap = await doc.ref.collection('summary').doc('latest').get()
      if (!summarySnap.exists) {
        continue
      }
      const summary = summarySnap.data() || {}
      const tradesSnap = await doc.ref.collection('trades').doc('byPair').get()
      const trades = tradesSnap.exists ? tradesSnap.data() || {} : {}
      const forexSnap = await doc.ref.collection('forex').doc('byPair').get()
      const forex = forexSnap.exists ? forexSnap.data() || {} : {}

      aggregatedSummary.total_trades += summary.total_trades || 0
      aggregatedSummary.total_wins += summary.total_wins || 0
      aggregatedSummary.total_losses += summary.total_losses || 0
      aggregatedSummary.total_pnl += summary.total_pnl || 0
      aggregatedSummary.open_positions.push(...(summary.open_positions || []))

      aggregatedSummary.account_info[accountId] = summary.account_info || {}
      mergePairSummary(aggregatedSummary.pairs_summary, summary.pairs_summary)

      for (const [symbol, symbolTrades] of Object.entries(trades)) {
        if (!Array.isArray(symbolTrades)) continue
        if (!aggregatedTrades[symbol]) {
          aggregatedTrades[symbol] = []
        }
        aggregatedTrades[symbol].push(...symbolTrades)
      }

      for (const [symbol, data] of Object.entries(forex)) {
        if (!aggregatedForex[symbol]) {
          aggregatedForex[symbol] = data
        } else if (aggregatedForex[symbol].candles && data && Array.isArray(data.candles)) {
          aggregatedForex[symbol].candles = [
            ...aggregatedForex[symbol].candles,
            ...data.candles
          ]
        }
      }
    }

    aggregatedSummary.total_pairs = Object.keys(aggregatedTrades).length
    aggregatedSummary.overall_win_rate = aggregatedSummary.total_trades
      ? (aggregatedSummary.total_wins / aggregatedSummary.total_trades) * 100
      : 0

    return NextResponse.json({
      summaryStats: aggregatedSummary,
      tradesData: aggregatedTrades,
      forexData: aggregatedForex
    })
  } catch (error: any) {
    console.error('Error loading data from Firestore:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to load data', details: error.message },
      { status: 500 }
    )
  }
}

