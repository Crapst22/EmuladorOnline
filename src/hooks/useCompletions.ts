'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

    const { data } = await supabase
      .from('game_completions')
      .select('game_id')
      .eq('user_id', user.id)

    setCompletedIds(new Set((data || []).map((c) => c.game_id)))
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

      setCompletedIds((prev) => {
        const next = new Set(prev)
        if (isCompleted) {
          next.delete(gameId)
        } else {
          next.add(gameId)
        }
        return next
      })

      if (isCompleted) {
        await supabase
          .from('game_completions')
          .delete()
          .eq('game_id', gameId)
          .eq('user_id', user.id)
      } else {
        const { error } = await supabase
          .from('game_completions')
          .insert({ game_id: gameId, user_id: user.id })
        if (error) {
          setCompletedIds((prev) => {
            const next = new Set(prev)
            next.delete(gameId)
            return next
          })
        }
      }
    },
    [supabase, completedIds]
  )

  return { completedIds, toggleCompletion, reloadCompletions: loadCompletions, loading }
}