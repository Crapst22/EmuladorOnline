'use client'

import { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GameCard } from './GameCard'
import { UploadRom } from './UploadRom'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/types'
import { motion } from 'framer-motion'

export function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadGames = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: sessions } = await supabase
      .from('play_sessions')
      .select('game_id')
      .eq('user_id', user.id)

    const playedIds = [...new Set(sessions?.map(s => s.game_id) || [])]

    let query = supabase.from('games').select('*').order('updated_at', { ascending: false })

    if (playedIds.length > 0) {
      query = query.or(`owner_id.eq.${user.id},id.in.(${playedIds.join(',')})`)
    } else {
      query = query.eq('owner_id', user.id)
    }

    const { data } = await query
    setGames(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadGames() }, [loadGames])

  const handleDelete = async (id: string) => {
    const { data: game } = await supabase.from('games').select('rom_path').eq('id', id).single()
    if (game) { await supabase.storage.from('roms').remove([game.rom_path]) }
    await supabase.from('saves').delete().eq('game_id', id)
    await supabase.from('play_sessions').delete().eq('game_id', id)
    await supabase.from('games').delete().eq('id', id)
    loadGames()
  }

  const handleRename = async (id: string, title: string) => {
    await supabase.from('games').update({ title }).eq('id', id)
    loadGames()
  }

  const filtered = games.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="retro-spinner" />
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="retro-panel-dark p-10 flex flex-col items-center justify-center py-20 text-center relative">
        <div className="retro-corner-tl" />
        <div className="retro-corner-tr" />
        <div className="retro-corner-bl" />
        <div className="retro-corner-br" />
        <div className="mb-6">
          <Gamepad2 className="h-16 w-16 text-[#FFD700]/40" />
        </div>
        <h3 className="font-pixel text-[0.7rem] text-[#FFD700] mb-4">TU BIBLIOTECA ESTA VACIA</h3>
        <p className="font-retro text-base text-[#A0A0A0] mb-6 max-w-sm">
          Sube tus ROMs de Super Nintendo para empezar a jugar desde cualquier dispositivo
        </p>
        <UploadRom onUploadComplete={loadGames} />
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]/40" />
          <Input placeholder="BUSCAR JUEGOS..." className="!pl-12" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <UploadRom onUploadComplete={loadGames} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 font-retro text-lg text-[#808080]">
          No se encontraron juegos con ese nombre
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((game, i) => (
            <GameCard key={game.id} game={game} onDelete={handleDelete} onRename={handleRename} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
