'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'retrocloud-completions'

function readLocal(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeLocal(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

export function useCompletions() {
  const supabase = createClient()
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadCompletions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setCompletedIds(new Set())
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('game_completions')
      .select('game_id')
      .eq('user_id', user.id)

    if (error) {
      // Table not available yet (migration pendiente): usar datos locales
      setCompletedIds(readLocal())
    } else {
      const ids = new Set((data || []).map((c) => c.game_id))
      setCompletedIds(ids)
      writeLocal(ids)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadCompletions()
  }, [loadCompletions])

  const toggleCompletion = useCallback(
    async (gameId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const isCompleted = completedIds.has(gameId)
      const next = new Set(completedIds)
      if (isCompleted) {
        next.delete(gameId)
      } else {
        next.add(gameId)
      }

      setCompletedIds(next)
      writeLocal(next)

      // Sincronizar con la base (si falla, la marca queda igual en local)
      if (isCompleted) {
        await supabase
          .from('game_completions')
          .delete()
          .eq('game_id', gameId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('game_completions')
          .insert({ game_id: gameId, user_id: user.id })
      }
    },
    [supabase, completedIds]
  )

  return { completedIds, toggleCompletion, reloadCompletions: loadCompletions, loading }
}