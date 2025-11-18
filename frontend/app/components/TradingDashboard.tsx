'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Target, Activity } from 'lucide-react'

interface TradingDashboardProps {
  children?: React.ReactNode
}

export default function TradingDashboard({ children }: TradingDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}


