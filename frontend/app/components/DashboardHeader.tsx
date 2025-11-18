'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Download, Share2, MoreVertical, ChevronDown } from 'lucide-react'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
}

export default function DashboardHeader({ title, subtitle, onRefresh, isRefreshing }: DashboardHeaderProps & { isRefreshing?: boolean }) {
  const [isMobile, setIsMobile] = useState(false)
  const [showSubtitle, setShowSubtitle] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-4 lg:mb-6"
    >
      {/* Mobile Header */}
      {isMobile ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <h1 className="text-xl font-bold text-white truncate">{title}</h1>
              {subtitle && (
                <button
                  onClick={() => setShowSubtitle(!showSubtitle)}
                  className="mt-1 flex items-center text-white/50 text-xs hover:text-white/70 transition-colors"
                >
                  <span className="truncate max-w-[200px]">{subtitle}</span>
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showSubtitle ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-white/10 active:bg-white/20 text-white transition-all touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          {showSubtitle && subtitle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-white/60 text-xs leading-relaxed"
            >
              {subtitle}
            </motion.div>
          )}
        </div>
      ) : (
        /* Desktop Header */
        <div className="flex flex-row items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 truncate">{title}</h1>
            {subtitle && (
              <p className="text-white/60 text-sm lg:text-base line-clamp-2">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2.5 lg:p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/10 hover:border-white/20"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-5 h-5 lg:w-6 lg:h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button 
              className="hidden sm:flex p-2 lg:p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] items-center justify-center"
              aria-label="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              className="hidden md:flex p-2 lg:p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] items-center justify-center"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              className="hidden lg:flex p-2 lg:p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] items-center justify-center"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
