'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  title: string
  children: React.ReactNode
  icon?: LucideIcon
  className?: string
  fullWidth?: boolean
}

export default function DashboardCard({ 
  title, 
  children, 
  icon: Icon, 
  className = "",
  fullWidth = false 
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass p-6 rounded-2xl ${fullWidth ? 'col-span-full' : ''} ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          {Icon && <Icon className="w-5 h-5 mr-2" />}
          {title}
        </h2>
      </div>
      {children}
    </motion.div>
  )
}
