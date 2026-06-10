'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cleanupOldSaves } from '@/lib/storage/saves'
import type { SyncStatus } from '@/types'

export function useSync(gameId: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [isOnline, setIsOnline] = useState(true)
  const supabase = createClient()
  const pendingSaves = useRef<Blob[]>([])

  const uploadSave = useCallback(async (blob: Blob, saveType: 'srm' | 'state') => {
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
      const version = Date.now()
      const savePath = `${userId}/${gameId}/${saveType}_v${version}`

      const { error: storageError } = await supabase.storage.from('saves').upload(savePath, blob, { upsert: true })
      if (storageError) {
        console.error('Storage upload error:', storageError)
        throw storageError
      }

      const { error: dbError } = await supabase.from('saves').insert(
        {
          game_id: gameId,
          user_id: userId,
          save_path: savePath,
          save_type: saveType,
          version,
        }
      )
      if (dbError) {
        console.error('DB insert error:', JSON.stringify(dbError))
        throw dbError
      }

      await cleanupOldSaves(gameId, saveType)

      setSyncStatus('synced')
    } catch (e) {
      console.error('Upload save failed:', (e as any)?.message || JSON.stringify(e))
      setSyncStatus('error')
    }
  }, [supabase, gameId])

  const downloadLatestSave = useCallback(async (saveType: 'srm' | 'state') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: saves, error: queryError } = await supabase
      .from('saves')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .eq('save_type', saveType)
      .order('version', { ascending: false })
      .limit(1)

    if (queryError) throw new Error(`Error al consultar guardados: ${queryError.message}`)
    if (!saves || saves.length === 0) return null

    const { data, error: downloadError } = await supabase.storage
      .from('saves')
      .download(saves[0].save_path)

    if (downloadError) throw new Error(`Error al descargar guardado: ${downloadError.message}`)
    return data || null
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
