'use client'

import { useEffect } from 'react'
import { pingLastSeen } from '@/lib/storage/roms'

export default function PresencePing() {
  useEffect(() => {
    let mounted = true
    pingLastSeen()
    const interval = setInterval(() => {
      if (mounted) pingLastSeen()
    }, 12_000)
    window.addEventListener('beforeunload', () => pingLastSeen())
    return () => {
      mounted = false
      clearInterval(interval)
      pingLastSeen()
    }
  }, [])
  return null
}
