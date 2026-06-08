'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { STORAGE_BUCKETS } from '@/lib/constants'

export async function downloadSave(savePath: string): Promise<ArrayBuffer | null> {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.SAVES)
    .download(savePath)

  return data ? await data.arrayBuffer() : null
}

export async function saveToCloud(
  gameId: string,
  saveType: 'srm' | 'state',
  data: Blob,
  version: number = 1
) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const savePath = `${user.id}/${gameId}/${saveType}_v${version}`

  await supabase.storage.from(STORAGE_BUCKETS.SAVES).upload(savePath, data, {
    upsert: true,
  })

  await supabase.from('saves').upsert(
    {
      game_id: gameId,
      user_id: user.id,
      save_path: savePath,
      save_type: saveType,
      version,
    },
    { onConflict: 'game_id,user_id,save_type,version' }
  )

  return { success: true }
}

export async function getSaveVersions(gameId: string, saveType: 'srm' | 'state') {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('saves')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .eq('save_type', saveType)
    .order('version', { ascending: false })

  return data || []
}
