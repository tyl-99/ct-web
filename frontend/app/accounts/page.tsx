'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  XCircle,
  RefreshCw,
  Users,
  Loader2,
  Power,
  PowerOff
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { usePathname, useRouter } from 'next/navigation'

interface Account {
  id: string
  name: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newAccountId, setNewAccountId] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [activeTab, setActiveTab] = useState('accounts')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [fetchingData, setFetchingData] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  
  const pathname = usePathname()
  const router = useRouter()

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Update active tab based on pathname
  useEffect(() => {
    if (pathname === '/accounts') {
      setActiveTab('accounts')
    }
  }, [pathname])

  // Handle tab change with navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Navigate to home page for tabs that aren't accounts
    if (tab !== 'accounts' && pathname === '/accounts') {
      router.push('/')
    }
  }

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/accounts')
      if (!response.ok) {
        throw new Error('Failed to load accounts')
      }
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts')
      console.error('Error loading accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const triggerDataFetch = useCallback(async (accountId?: string) => {
    // Request notification permission if not already granted/denied (iOS requirement)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission
      if (currentPermission === 'default') {
        try {
          await Notification.requestPermission()
        } catch (error) {
          console.warn('Failed to request notification permission:', error)
        }
      }
    }
    
    try {
      setFetchingData(accountId || 'all')
      const response = await fetch('/api/accounts/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountId ? { account_id: accountId } : {})
      })
      
      if (!response.ok) {
        throw new Error('Failed to trigger data fetch')
      }
      
      // Refresh accounts after a delay to see updated status
      setTimeout(() => {
        loadAccounts()
        setFetchingData(null)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to trigger data fetch')
      setFetchingData(null)
    }
  }, [loadAccounts])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleAddAccount = async () => {
    if (!newAccountId.trim()) {
      setError('Account ID is required')
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: newAccountId.trim(),
          name: newAccountName.trim() || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add account')
      }

      const result = await response.json()
      setNewAccountId('')
      setNewAccountName('')
      setIsAdding(false)
      
      // Show message if data fetch was triggered
      if (result.data_fetch_triggered) {
        console.log('✅ Account added and data fetch triggered')
      }
      
      await loadAccounts()
    } catch (err: any) {
      setError(err.message || 'Failed to add account')
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm(`Are you sure you want to delete account ${accountId}?`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      await loadAccounts()
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
    }
  }

  const handleStartEdit = (account: Account) => {
    setEditingId(account.id)
    setEditName(account.name)
  }

  const handleSaveEdit = async (accountId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update account')
      }

      setEditingId(null)
      setEditName('')
      await loadAccounts()
    } catch (err: any) {
      setError(err.message || 'Failed to update account')
    }
  }

  const handleToggleEnabled = async (account: Account) => {
    try {
      setError(null)
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !account.enabled })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update account')
      }

      await loadAccounts()
    } catch (err: any) {
      setError(err.message || 'Failed to update account')
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} isMobile={isMobile} />
      
      <main className="flex-1 lg:ml-64 px-4 py-4 lg:p-8 pb-20 lg:pb-8" style={{ paddingTop: 'max(env(safe-area-inset-top, 0), 1rem)' }}>
        {/* Mobile Header */}
        {isMobile ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
                <h1 className="text-xl font-bold text-white">
                  Accounts
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAccounts}
                  className="p-2.5 rounded-xl bg-white/10 active:bg-white/20 text-white transition-all touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsAdding(true)
                    setShowAddModal(true)
                  }}
                  className="p-2.5 rounded-xl bg-primary-500 active:bg-primary-600 text-white transition-all touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg"
                  aria-label="Add Account"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Desktop Header */
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                <h1 className="text-3xl font-bold text-white">
                  Account Management
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadAccounts}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)'
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Account
                </button>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Manage your cTrader accounts. Accounts marked as enabled will be processed when fetching data.
            </p>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl flex items-center gap-3 bg-red-500/10 border border-red-500/30"
          >
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-red-500/20 transition-colors touch-manipulation"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}

        {/* Desktop Add Account Form */}
        {!isMobile && (
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-6 rounded-xl glass"
              >
                <h3 className="text-lg font-semibold mb-4 text-white">
                  Add New Account
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-white/80">
                      Account ID *
                    </label>
                    <input
                      type="text"
                      value={newAccountId}
                      onChange={(e) => setNewAccountId(e.target.value)}
                      placeholder="e.g., 12345678"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-white/80">
                      Account Name (optional)
                    </label>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Demo Account"
                      className="input-field w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleAddAccount}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors touch-manipulation"
                  >
                    <Save className="w-4 h-4" />
                    Add Account
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewAccountId('')
                      setNewAccountName('')
                    }}
                    className="px-4 py-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 transition-colors touch-manipulation"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Mobile Add Account Modal */}
        <AnimatePresence>
          {isMobile && showAddModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowAddModal(false)
                  setIsAdding(false)
                  setNewAccountId('')
                  setNewAccountName('')
                }}
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
                    <Plus className="w-5 h-5 mr-2" style={{ color: 'var(--primary-400)' }} />
                    Add Account
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setIsAdding(false)
                      setNewAccountId('')
                      setNewAccountName('')
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Account ID *
                    </label>
                    <input
                      type="text"
                      value={newAccountId}
                      onChange={(e) => setNewAccountId(e.target.value)}
                      placeholder="e.g., 12345678"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Account Name (optional)
                    </label>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Demo Account"
                      className="input-field w-full"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        handleAddAccount()
                        setShowAddModal(false)
                      }}
                      className="flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors touch-manipulation font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Add Account
                    </button>
                    <button
                      onClick={() => {
                        setShowAddModal(false)
                        setIsAdding(false)
                        setNewAccountId('')
                        setNewAccountName('')
                      }}
                      className="px-4 py-3 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Accounts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : accounts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 rounded-xl glass"
          >
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50 text-white/40" />
            <p className="text-lg mb-2 text-white font-semibold">
              No accounts configured
            </p>
            <p className="text-sm mb-4 text-white/60">
              Add your first account to get started
            </p>
            <button
              onClick={() => {
                setIsAdding(true)
                if (isMobile) {
                  setShowAddModal(true)
                }
              }}
              className="px-6 py-3 rounded-lg inline-flex items-center gap-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors touch-manipulation font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            {accounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 lg:p-6 rounded-xl glass"
              >
                {isMobile ? (
                  /* Mobile Card Layout */
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        {editingId === account.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input-field flex-1 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(account.id)}
                              className="p-2 rounded-lg bg-green-500/20 text-green-400 touch-manipulation"
                              aria-label="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditName('')
                              }}
                              className="p-2 rounded-lg bg-white/5 text-white/60 touch-manipulation"
                              aria-label="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-base font-semibold text-white mb-1 truncate">
                              {account.name || `Account ${account.id}`}
                            </h3>
                            <p className="text-xs text-white/50">
                              ID: {account.id}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!editingId && (
                          <button
                            onClick={() => handleStartEdit(account)}
                            className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors touch-manipulation"
                            aria-label="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors touch-manipulation"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleToggleEnabled(account)}
                        className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors touch-manipulation font-medium ${
                          account.enabled 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-white/5 text-white/60 border border-white/10'
                        }`}
                      >
                        {account.enabled ? (
                          <>
                            <Power className="w-4 h-4" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Disabled
                          </>
                        )}
                      </button>
                      
                      {account.enabled && (
                        <button
                          onClick={() => triggerDataFetch(account.id)}
                          disabled={fetchingData === account.id}
                          className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 touch-manipulation font-medium"
                        >
                          {fetchingData === account.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Fetch Data
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Desktop Card Layout */
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {editingId === account.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input-field"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(account.id)}
                              className="p-1 rounded text-green-400 hover:bg-green-500/20 transition-colors"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditName('')
                              }}
                              className="p-1 rounded text-white/60 hover:bg-white/10 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold text-white">
                              {account.name || `Account ${account.id}`}
                            </h3>
                            <button
                              onClick={() => handleStartEdit(account)}
                              className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity text-white/60"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-white/60">
                          ID: {account.id}
                        </p>
                        {account.created_at && (
                          <p className="text-xs text-white/40">
                            Created: {new Date(account.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {account.enabled && (
                        <button
                          onClick={() => triggerDataFetch(account.id)}
                          disabled={fetchingData === account.id}
                          className="px-4 py-2 rounded-lg flex items-center gap-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 touch-manipulation"
                        >
                          {fetchingData === account.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Fetching...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Fetch Data
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleEnabled(account)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                          account.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {account.enabled ? (
                          <>
                            <Power className="w-4 h-4" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Disabled
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
      
      {/* Bottom Navigation - Mobile Only */}
      <BottomNav activeTab={activeTab === 'accounts' ? 'settings' : activeTab} onTabChange={handleTabChange} />
    </div>
  )
}

