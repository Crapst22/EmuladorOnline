'use client'

import { useEffect, useRef, useCallback } from 'react'
import { AUTO_SAVE_INTERVAL } from '@/lib/constants'

interface UseAutoSaveOptions {
  gameId: string
  onSave: () => Promise<void>
  enabled: boolean
}

export function useAutoSave({ gameId, onSave, enabled }: UseAutoSaveOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveRef = useRef(onSave)

  saveRef.current = onSave

  const startAutoSave = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      try {
        await saveRef.current()
      } catch {}
    }, AUTO_SAVE_INTERVAL)
  }, [])

  const stopAutoSave = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled && gameId) {
      startAutoSave()
    } else {
      stopAutoSave()
    }

    return stopAutoSave
  }, [enabled, gameId, startAutoSave, stopAutoSave])

  return { startAutoSave, stopAutoSave }
}
