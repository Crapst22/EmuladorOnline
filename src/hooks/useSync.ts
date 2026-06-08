'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SyncStatus } from '@/types'

export function useSync(gameId: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [isOnline, setIsOnline] = useState(true)
  const supabase = createClient()
  const pendingSaves = useRef<Blob[]>([])

  const uploadSave = useCallback(async (blob: Blob, saveType: 'srm' | 'state', version: number = 1) => {
    if (!navigator.onLine) {
      pendingSaves.current.push(blob)
      setSyncStatus('offline')
      return
    }

    setSyncStatus('saving')

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }
      if (!session?.user) throw new Error('No autenticado')

      const userId = session.user.id
      const savePath = `${userId}/${gameId}/${saveType}_v${version}`

      await supabase.storage.from('saves').remove([savePath])

      const { error: storageError } = await supabase.storage.from('saves').upload(savePath, blob)
      if (storageError) {
        console.error('Storage upload error:', storageError)
        throw storageError
      }

      const { error: dbError } = await supabase.from('saves').upsert(
        {
          game_id: gameId,
          user_id: userId,
          save_path: savePath,
          save_type: saveType,
          version,
        },
        { onConflict: 'game_id,user_id,save_type,version' }
      )
      if (dbError) {
        console.error('DB upsert error:', dbError)
        throw dbError
      }

      setSyncStatus('synced')
    } catch (e) {
      console.error('Upload save failed:', e)
      setSyncStatus('error')
    }
  }, [supabase, gameId])

  const downloadLatestSave = useCallback(async (saveType: 'srm' | 'state') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: saves } = await supabase
        .from('saves')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .eq('save_type', saveType)
        .order('version', { ascending: false })
        .limit(1)

      if (!saves || saves.length === 0) return null

      const { data } = await supabase.storage
        .from('saves')
        .download(saves[0].save_path)

      return data || null
    } catch {
      return null
    }
  }, [supabase, gameId])

  const syncPendingSaves = useCallback(async () => {
    if (!navigator.onLine || pendingSaves.current.length === 0) return

    setSyncStatus('saving')

    for (const blob of pendingSaves.current) {
      await uploadSave(blob, 'srm')
    }

    pendingSaves.current = []
    setSyncStatus('synced')
  }, [uploadSave])

  return {
    syncStatus,
    isOnline,
    setIsOnline,
    uploadSave,
    downloadLatestSave,
    syncPendingSaves,
  }
}
