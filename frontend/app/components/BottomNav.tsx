'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { 
  Home,
  TrendingUp,
  PieChart,
  Settings
} from 'lucide-react'

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'trades', label: 'Trades', icon: TrendingUp },
    { id: 'performance', label: 'Stats', icon: PieChart },
    { id: 'settings', label: 'More', icon: Settings },
  ]

  const handleClick = (itemId: string) => {
    onTabChange(itemId)
  }

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl safe-area-bottom"
      style={{
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderColor: 'var(--border-primary)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
        height: 'calc(4rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full touch-manipulation min-w-0 px-2"
              style={{
                color: isActive ? 'var(--primary-400)' : 'var(--text-muted)',
              }}
            >
              <Icon 
                className="w-5 h-5 mb-1" 
                style={{ 
                  color: isActive ? 'var(--primary-400)' : 'inherit' 
                }} 
              />
              <span 
                className="text-xs font-medium truncate w-full text-center"
                style={{
                  color: isActive ? 'var(--primary-400)' : 'inherit'
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <div 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/3 h-0.5 rounded-t-full"
                  style={{ backgroundColor: 'var(--primary-400)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

