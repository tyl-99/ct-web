'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface DashboardGridProps {
  children: React.ReactNode
}

export default function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {children}
    </motion.div>
  )
}
