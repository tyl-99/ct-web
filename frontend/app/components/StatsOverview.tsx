'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Activity } from 'lucide-react'

interface StatsOverviewProps {
  stats: {
    total_trades: number
    total_wins: number
    total_losses: number
    total_pnl: number
    overall_win_rate: number
    pairs_summary: Record<string, any>
  }
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Trades */}
        <div 
          className="p-6 rounded-2xl border"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Total Trades</p>
              <p className="text-2xl font-bold text-white">{stats.total_trades}</p>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
            >
              <BarChart3 className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div 
          className="p-6 rounded-2xl border"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-white">{stats.overall_win_rate.toFixed(1)}%</p>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
            >
              <Target className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Total P&L */}
        <div 
          className="p-6 rounded-2xl border"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Total P&L</p>
              <p className={`text-2xl font-bold ${
                stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${stats.total_pnl.toFixed(2)}
              </p>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ 
                backgroundColor: stats.total_pnl >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' 
              }}
            >
              <DollarSign className={`w-6 h-6 ${
                stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`} />
            </div>
          </div>
        </div>

        {/* Win/Loss Ratio */}
        <div 
          className="p-6 rounded-2xl border"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Win/Loss</p>
              <p className="text-2xl font-bold text-white">
                {stats.total_wins}/{stats.total_losses}
              </p>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
            >
              <Activity className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Pairs Summary */}
      <div 
        className="mt-6 p-6 rounded-2xl border"
        style={{
          backgroundColor: 'var(--background-secondary)',
          borderColor: 'var(--primary-500)',
        }}
      >
        <h3 className="text-lg font-bold text-white mb-4">Pairs Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(stats.pairs_summary).map(([pair, pairStats]: [string, any]) => (
            <div 
              key={pair} 
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderColor: 'rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">{pair.replace('_', '/')}</h4>
                <div className={`flex items-center space-x-1 ${
                  pairStats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {pairStats.total_pnl >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    ${pairStats.total_pnl.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Trades:</span>
                  <span className="text-white ml-1">{pairStats.total_trades}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Win Rate:</span>
                  <span className="text-white ml-1">{pairStats.win_rate.toFixed(1)}%</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Wins:</span>
                  <span className="text-green-400 ml-1">{pairStats.wins}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Losses:</span>
                  <span className="text-red-400 ml-1">{pairStats.losses}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
} 