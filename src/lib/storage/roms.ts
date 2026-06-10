'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { MAX_ROM_SIZE, ALLOWED_ROM_EXTENSIONS, STORAGE_BUCKETS } from '@/lib/constants'
import { cleanupOldSaves } from '@/lib/storage/saves'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import type { Game } from '@/types'

export async function uploadRom(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const file = formData.get('file') as File
  const title = formData.get('title') as string
  const consoleType = (formData.get('console_type') as string) || 'snes'

  if (!file) return { error: 'No se proporcionó archivo' }
  if (!title) return { error: 'El título es requerido' }

  if (file.size > MAX_ROM_SIZE) {
    return { error: 'El archivo excede el tamaño máximo permitido (50MB)' }
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_ROM_EXTENSIONS.includes(extension)) {
    return { error: 'Tipo de archivo no permitido. Use: .smc, .sfc, .fig' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

  const { data: hashMatch } = await supabase
    .from('games')
    .select('title')
    .eq('file_hash', fileHash)
    .limit(1)

  if (hashMatch && hashMatch.length > 0) {
    return { error: 'Ese archivo ROM ya fue subido por otro usuario. Fijate en la pantalla de Juegos Cargados.' }
  }

  const { data: titleMatch } = await supabase
    .from('games')
    .select('title')
    .ilike('title', title)
    .limit(1)

  if (titleMatch && titleMatch.length > 0) {
    return { error: 'Ya existe un juego con ese nombre. Fijate en la pantalla de Juegos Cargados.' }
  }

  const filePath = `${user.id}/${crypto.randomUUID()}${extension}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.ROMS)
    .upload(filePath, file)

  if (uploadError) return { error: 'Error al subir archivo' }

  const { error: dbError } = await supabase.from('games').insert({
    owner_id: user.id,
    title,
    console_type: consoleType,
    rom_path: filePath,
    file_hash: fileHash,
  })

  if (dbError) {
    await supabase.storage.from(STORAGE_BUCKETS.ROMS).remove([filePath])
    return { error: 'Error al guardar información del juego' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/juegos')
  return { success: true }
}

export async function deleteRom(gameId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: game } = await supabase
    .from('games')
    .select('rom_path')
    .eq('id', gameId)
    .single()

  if (!game) return { error: 'Juego no encontrado' }

  await supabase.storage.from(STORAGE_BUCKETS.ROMS).remove([game.rom_path])

  await supabase.from('saves').delete().eq('game_id', gameId)
  await supabase.from('play_sessions').delete().eq('game_id', gameId)
  await supabase.from('games').delete().eq('id', gameId)

  revalidatePath('/dashboard')
  revalidatePath('/juegos')
  return { success: true }
}

export async function renameRom(gameId: string, newTitle: string) {
  const supabase = await createServerSupabaseClient()
  const serviceRole = createServiceRoleClient()
  if (!serviceRole) return { error: 'Error de configuración del servidor' }

  const { error } = await serviceRole
    .from('games')
    .update({ title: newTitle })
    .eq('id', gameId)

  if (error) return { error: 'Error al renombrar' }

  revalidatePath('/dashboard')
  revalidatePath('/juegos')
  return { success: true }
}

export async function getUserGames() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  return data || []
}

export async function getAllGames() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('games')
    .select('*, users!inner(username)')
    .order('updated_at', { ascending: false })

  if (!data) return []

  return data.map((game: any) => ({
    ...game,
    owner_username: game.users?.username || 'Usuario',
  }))
}

export async function getGameById(gameId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  return data
}

export async function getRomDownloadUrl(romPath: string) {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.ROMS)
    .createSignedUrl(romPath, 3600)

  return data?.signedUrl || null
}

export async function getSaveUrl(savePath: string) {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.SAVES)
    .createSignedUrl(savePath, 3600)

  return data?.signedUrl || null
}

export async function uploadSave(
  gameId: string,
  saveType: 'srm' | 'state',
  blob: Blob,
  version: number = 1
) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const savePath = `${user.id}/${gameId}/${saveType}_v${version}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.SAVES)
    .upload(savePath, blob, { upsert: true })

  if (uploadError) return { error: 'Error al subir guardado' }

  const { error: dbError } = await supabase.from('saves').upsert(
    {
      game_id: gameId,
      user_id: user.id,
      save_path: savePath,
      save_type: saveType,
      version,
    },
    { onConflict: 'game_id,user_id,save_type,version' }
  )

  if (dbError) return { error: 'Error al registrar guardado' }

  await cleanupOldSaves(gameId, saveType)

  return { success: true, savePath }
}

export async function getLatestSave(gameId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: saves } = await supabase
    .from('saves')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)

  if (!saves || saves.length === 0) return null

  const url = await getSaveUrl(saves[0].save_path)
  return { ...saves[0], url }
}

export async function recordPlaySession(gameId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: existing } = await supabase
    .from('play_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .is('ended_at', null)
    .single()

  if (existing) return existing

  const { data } = await supabase
    .from('play_sessions')
    .insert({
      user_id: user.id,
      game_id: gameId,
    })
    .select()
    .single()

  return data
}

export async function endPlaySession(sessionId: string) {
  const supabase = await createServerSupabaseClient()

  await supabase
    .from('play_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function archiveGame(gameId: string) {
  const supabase = await createServerSupabaseClient()
  const serviceRole = createServiceRoleClient()
  if (!serviceRole) return { error: 'Error de configuración del servidor' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await serviceRole
    .from('games')
    .update({ archived: true })
    .eq('id', gameId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getDashboardGames() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', games: [], userId: null }

  const [ownedResult, sessionsResult] = await Promise.all([
    supabase
      .from('games')
      .select('*')
      .eq('owner_id', user.id)
      .eq('archived', false)
      .order('updated_at', { ascending: false }),
    supabase
      .from('play_sessions')
      .select('game_id')
      .eq('user_id', user.id),
  ])

  const ownedGames = ownedResult.data || []
  const sessions = sessionsResult.data || []
  const playedIds = [...new Set(sessions.map(s => s.game_id))]

  let playedGames: Game[] = []
  if (playedIds.length > 0) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .in('id', playedIds)
      .order('updated_at', { ascending: false })
    playedGames = data || []
  }

  const merged = [...ownedGames]
  const seenIds = new Set(merged.map(g => g.id))
  for (const g of playedGames) {
    if (!seenIds.has(g.id)) {
      merged.push(g)
      seenIds.add(g.id)
    }
  }

  return { games: merged, userId: user.id }
}

export async function removePlaySessions(gameId: string) {
  const supabase = await createServerSupabaseClient()
  const serviceRole = createServiceRoleClient()
  if (!serviceRole) return { error: 'Error de configuración del servidor' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await serviceRole
    .from('play_sessions')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export interface OnlineUser {
  id: string
  username: string
  avatar_url?: string
  current_game?: { id: string; title: string } | null
}

export async function pingLastSeen() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const serviceRole = createServiceRoleClient()
  if (!serviceRole) return

  await serviceRole.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
}

export async function closePlaySession(sessionId: string) {
  const serviceRole = createServiceRoleClient()
  if (!serviceRole) return { error: 'Error de configuración del servidor' }

  const { error } = await serviceRole
    .from('play_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getOnlineUsers() {
  const supabase = await createServerSupabaseClient()
  const serviceRole = createServiceRoleClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { online: [], total: 0 }

  await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

  const twelveSecAgo = new Date(Date.now() - 12 * 1000).toISOString()

  const recentUsersPromise = supabase
    .from('users')
    .select('id, username, avatar_url')
    .gte('last_seen', twelveSecAgo)

  let activeSessions: { user_id: string; game_id: string }[] | null = null

  if (serviceRole) {
    const { data } = await serviceRole
      .from('play_sessions')
      .select('user_id, game_id')
      .is('ended_at', null)
    activeSessions = data
  }

  const { data: recentUsers } = await recentUsersPromise

  const recentIds = new Set(recentUsers?.map((u) => u.id) || [])
  const playingIds = new Set(activeSessions?.map((s) => s.user_id) || [])

  const allOnlineIds = new Set([...recentIds, ...playingIds])

  if (allOnlineIds.size === 0) return { online: [], total: 0 }

  const { data: allUsers } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .in('id', [...allOnlineIds])

  if (!allUsers) return { online: [], total: 0 }

  const sessionMap = new Map<string, { id: string; title: string }>()
  if (activeSessions) {
    const activeGameIds = [...new Set(activeSessions.map((s) => s.game_id))]
    const db = serviceRole || supabase
    const { data: games } = await db
      .from('games')
      .select('id, title')
      .in('id', activeGameIds)

    const gameTitles = new Map<string, string>()
    if (games) {
      for (const g of games) gameTitles.set(g.id, g.title)
    }

    for (const s of activeSessions) {
      sessionMap.set(s.user_id, { id: s.game_id, title: gameTitles.get(s.game_id) || 'Jugando' })
    }
  }

  const online = allUsers.map((u) => ({
    id: u.id,
    username: u.username,
    avatar_url: u.avatar_url,
    current_game: sessionMap.get(u.id) || null,
  }))

  return { online, total: online.length }
}
