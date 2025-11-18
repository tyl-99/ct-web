'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, TrendingUp, TrendingDown, Calendar, DollarSign, Users, X, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface TradesListProps {
  trades: any[]
  selectedTrade: any | null
  onTradeSelect: (trade: any) => void
  totalTradesAll: number
  onTradeClick?: (trade: any) => void
  accounts?: Array<{ account_id: string; name?: string }>
  selectedAccountId?: string | null
  onAccountChange?: (accountId: string | 'ALL') => void
}

export default function TradesList({ 
  trades, 
  selectedTrade, 
  onTradeSelect, 
  totalTradesAll, 
  onTradeClick,
  accounts = [],
  selectedAccountId,
  onAccountChange
}: TradesListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [sortBy, setSortBy] = useState('date')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState(0)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Count active filters
  useEffect(() => {
    let count = 0
    if (searchTerm) count++
    if (filterStatus !== 'ALL') count++
    if (sortBy !== 'date') count++
    if (rowsPerPage !== 10) count++
    setActiveFilters(count)
  }, [searchTerm, filterStatus, sortBy, rowsPerPage])

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trade['Buy/Sell']?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'ALL' || trade['Win/Lose'] === filterStatus
    return matchesSearch && matchesFilter
  })

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b['Entry DateTime']).getTime() - new Date(a['Entry DateTime']).getTime()
      case 'pnl':
        return b.PnL - a.PnL
      case 'pips':
        return b.Pips - a.Pips
      default:
        return 0
    }
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedTrades.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedTrades = sortedTrades.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, sortBy, rowsPerPage])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="p-6 rounded-2xl border"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" style={{ color: 'var(--primary-400)' }} />
          Trades History
        </h2>
        <div style={{ color: 'var(--text-muted)' }}>
          {filteredTrades.length} of {totalTradesAll} trades
        </div>
      </div>

      {/* Mobile Filter Button */}
      {isMobile && (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/10"
            aria-label="Filters"
          >
            <Filter className="w-5 h-5" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Desktop Filters */}
      {!isMobile && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Account Selector */}
          {accounts.length > 0 && onAccountChange && (
            <div className="relative">
              <Users 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                style={{ color: 'var(--text-muted)' }}
              />
              <select
                value={selectedAccountId || (accounts[0]?.account_id || '')}
                onChange={(e) => onAccountChange(e.target.value === 'ALL' ? 'ALL' : e.target.value)}
                className="input-field pl-10 pr-8"
                style={{ minWidth: '180px' }}
              >
                {accounts.length > 1 && <option value="ALL">All Accounts</option>}
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.name || `Account ${acc.account_id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="ALL">All Trades</option>
            <option value="WIN">Wins Only</option>
            <option value="LOSE">Losses Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
          >
            <option value="date">Sort by Date</option>
            <option value="pnl">Sort by P&L</option>
            <option value="pips">Sort by Pips</option>
          </select>

          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="input-field"
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
      )}

      {/* Mobile Filter Panel */}
      <AnimatePresence>
        {isMobile && showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/80 z-40 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto lg:hidden"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <Filter className="w-5 h-5 mr-2" style={{ color: 'var(--primary-400)' }} />
                  Filters
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Account Selector */}
                {accounts.length > 0 && onAccountChange && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Account
                    </label>
                    <select
                      value={selectedAccountId || (accounts[0]?.account_id || '')}
                      onChange={(e) => onAccountChange(e.target.value === 'ALL' ? 'ALL' : e.target.value)}
                      className="input-field w-full"
                    >
                      {accounts.length > 1 && <option value="ALL">All Accounts</option>}
                      {accounts.map((acc) => (
                        <option key={acc.account_id} value={acc.account_id}>
                          {acc.name || `Account ${acc.account_id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Trade Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['ALL', 'WIN', 'LOSE'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all touch-manipulation ${
                          filterStatus === status
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        {status === 'ALL' ? 'All' : status === 'WIN' ? 'Wins' : 'Losses'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="pnl">P&L (Highest First)</option>
                    <option value="pips">Pips (Highest First)</option>
                  </select>
                </div>

                {/* Rows Per Page */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Rows Per Page
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[5, 10, 25, 50, 100].map((num) => (
                      <button
                        key={num}
                        onClick={() => setRowsPerPage(num)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation ${
                          rowsPerPage === num
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Filters Summary */}
                {activeFilters > 0 && (
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterStatus('ALL')
                        setSortBy('date')
                        setRowsPerPage(10)
                      }}
                      className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-white/80 transition-colors touch-manipulation"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr 
              className="text-sm border-b"
              style={{ 
                color: 'var(--text-muted)',
                borderColor: 'var(--border-primary)'
              }}
            >
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Pair</th>
              <th className="text-left p-3">Direction</th>
              <th className="text-left p-3">Entry Price</th>
              <th className="text-left p-3">SL</th>
              <th className="text-left p-3">TP</th>
              <th className="text-left p-3">Pips</th>
              <th className="text-left p-3">Lots</th>
              <th className="text-left p-3">P&L</th>
              <th className="text-left p-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map((trade, index) => (
              <motion.tr
                key={trade['Trade ID'] || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                onClick={() => {
                  onTradeSelect(trade)
                  if (onTradeClick) {
                    onTradeClick(trade)
                  }
                }}
                className="cursor-pointer transition-colors border-b"
                style={{
                  borderColor: 'var(--border-primary)',
                  backgroundColor: selectedTrade === trade ? 'rgba(249, 115, 22, 0.1)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (selectedTrade !== trade) {
                    e.currentTarget.style.backgroundColor = 'var(--background-tertiary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTrade !== trade) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <td className="p-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                    {format(new Date(trade['Entry DateTime']), 'MMM dd, HH:mm')}
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-white font-semibold text-sm px-2 py-1 rounded-md" 
                        style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}>
                    {trade.pair}
                  </span>
                </td>
                <td className="p-3">
                  <div className={`flex items-center font-medium ${
                    trade['Buy/Sell'] === 'BUY' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade['Buy/Sell'] === 'BUY' ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {trade['Buy/Sell']}
                  </div>
                </td>
                <td className="p-3 text-white font-mono text-sm">
                  {trade['Entry Price']}
                </td>
                <td className="p-3 text-white font-mono text-sm">
                  {trade.SL !== 'N/A' ? trade.SL : 'N/A'}
                </td>
                <td className="p-3 text-white font-mono text-sm">
                  {trade.TP !== 'N/A' ? trade.TP : 'N/A'}
                </td>
                <td className="p-3 text-white font-mono text-sm">
                  {trade.Pips !== undefined ? (trade.Pips > 0 ? '+' : '') + trade.Pips : 'N/A'}
                </td>
                <td className="p-3 text-white font-mono text-sm">
                  {trade.Lots}
                </td>
                <td className="p-3">
                  <div className={`flex items-center font-medium ${
                    trade.PnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <DollarSign className="w-4 h-4 mr-1" />
                    {trade.PnL >= 0 ? '+' : ''}${trade.PnL}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trade['Win/Lose'] === 'WIN' ? 'trade-win' : 'trade-loss'
                  }`}>
                    {trade['Win/Lose']}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div style={{ color: 'var(--text-muted)' }} className="text-sm">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedTrades.length)} of {sortedTrades.length} trades
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentPage === 1 ? 'var(--background-tertiary)' : 'rgba(249, 115, 22, 0.2)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--primary-400)',
                border: '1px solid var(--border-primary)',
              }}
            >
              Previous
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: currentPage === i + 1 ? 'var(--primary-500)' : 'rgba(0, 0, 0, 0.5)',
                  color: currentPage === i + 1 ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentPage === totalPages ? 'var(--background-tertiary)' : 'rgba(249, 115, 22, 0.2)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--primary-400)',
                border: '1px solid var(--border-primary)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {sortedTrades.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Filter className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No trades found matching your criteria</p>
        </div>
      )}
    </motion.div>
  )
} 