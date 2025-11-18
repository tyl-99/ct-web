'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { 
  TrendingUp, 
  DollarSign, 
  Settings, 
  Home,
  Activity,
  PieChart,
  Target,
  Bell,
  Menu,
  X,
  Users
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isMobile?: boolean
}

export default function Sidebar({ activeTab, onTabChange, isMobile = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home, path: '/' },
    { id: 'trades', label: 'Trades', icon: TrendingUp, path: '/' },
    { id: 'performance', label: 'Performance', icon: PieChart, path: '/' },
    { id: 'risk', label: 'Risk', icon: Target, path: '/' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/' },
    { id: 'accounts', label: 'Accounts', icon: Users, path: '/accounts' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/' },
  ]

  const handleTabClick = (item: typeof menuItems[0]) => {
    onTabChange(item.id)
    if (item.path && item.path !== pathname) {
      router.push(item.path)
    }
    // Close mobile menu after selection
    if (isMobile) {
      setIsOpen(false)
    }
  }

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Desktop Sidebar
  if (!isMobile) {
    return (
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`hidden lg:flex fixed left-0 top-0 h-full backdrop-blur-lg border-r z-40 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{
          background: 'rgba(10, 10, 10, 0.98)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--primary-500), var(--accent-orange))' 
                  }}
                >
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">TraderBot</h1>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs">Live Dashboard</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg transition-colors touch-manipulation"
              style={{
                backgroundColor: 'var(--background-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id || (item.path === pathname && pathname !== '/')
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                style={{
                  backgroundColor: isActive ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                  color: isActive ? 'var(--primary-400)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid transparent',
                }}
              >
                <Icon 
                  className="w-5 h-5 flex-shrink-0" 
                  style={{ 
                    color: isActive ? 'var(--primary-400)' : 'inherit' 
                  }} 
                />
                {!isCollapsed && (
                  <span className="font-medium text-left">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeTab"
                    className="ml-auto w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--primary-400)' }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Status Indicator */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div 
            className={`flex items-center space-x-2 p-3 rounded-lg ${
              isCollapsed ? 'justify-center' : ''
            }`}
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {!isCollapsed && (
                <div>
                  <p className="text-green-400 text-sm font-medium">Live</p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs">Connected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Mobile Sidebar (Drawer)
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-lg backdrop-blur-lg touch-manipulation"
        style={{
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)',
        }}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/80 z-40"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 h-full w-72 backdrop-blur-lg border-r z-50"
              style={{
                background: 'rgba(10, 10, 10, 0.98)',
                borderColor: 'var(--border-primary)',
              }}
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary-500), var(--accent-orange))' 
                    }}
                  >
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-lg">TraderBot</h1>
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs">Live Dashboard</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg touch-manipulation"
                  style={{
                    backgroundColor: 'var(--background-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-2 overflow-y-auto flex-1 h-[calc(100vh-200px)]">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id || (item.path === pathname && pathname !== '/')
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item)}
                      className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all touch-manipulation min-h-[48px]"
                      style={{
                        backgroundColor: isActive ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                        color: isActive ? 'var(--primary-400)' : 'var(--text-secondary)',
                        border: isActive ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid transparent',
                      }}
                    >
                      <Icon 
                        className="w-5 h-5 flex-shrink-0" 
                        style={{ 
                          color: isActive ? 'var(--primary-400)' : 'inherit' 
                        }} 
                      />
                      <span className="font-medium text-left">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTabMobile"
                          className="ml-auto w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--primary-400)' }}
                        />
                      )}
                    </button>
                  )
                })}
              </nav>

              {/* Status Indicator */}
              <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div 
                  className="flex items-center space-x-2 p-3 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-green-400 text-sm font-medium">Live</p>
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs">Connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
