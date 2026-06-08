'use client'

import { motion } from 'framer-motion'
import { Cloud, CloudOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { SyncStatus } from '@/types'

interface SyncIndicatorProps {
  status: SyncStatus
}

const config: Record<SyncStatus, { icon: typeof Cloud; label: string; color: string }> = {
  synced: { icon: CheckCircle2, label: 'Sincronizado', color: 'text-green-400' },
  saving: { icon: Loader2, label: 'Guardando...', color: 'text-blue-400' },
  error: { icon: AlertTriangle, label: 'Error al guardar', color: 'text-red-400' },
  offline: { icon: CloudOff, label: 'Sin conexión', color: 'text-yellow-400' },
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
  const { icon: Icon, label, color } = config[status]

  return (
    <motion.div
      className={`flex items-center gap-1.5 text-xs ${color}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={status}
    >
      {status === 'saving' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </motion.div>
  )
}
