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

    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    setGames(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadGames() }, [loadGames])

  const handleDelete = async (id: string) => {
    const { data: game } = await supabase.from('games').select('rom_path').eq('id', id).single()
    if (game) {
      await supabase.storage.from('roms').remove([game.rom_path])
    }
    await supabase.from('saves').delete().eq('game_id', id)
    await supabase.from('play_sessions').delete().eq('game_id', id)
    await supabase.from('games').delete().eq('id', id)
    loadGames()
  }

  const handleRename = async (id: string, title: string) => {
    await supabase.from('games').update({ title }).eq('id', id)
    loadGames()
  }

  const filtered = games.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="h-20 w-20 rounded-3xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-6">
          <Gamepad2 className="h-10 w-10 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Tu biblioteca está vacía</h3>
        <p className="text-zinc-400 mb-8 max-w-sm">
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar juegos..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <UploadRom onUploadComplete={loadGames} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No se encontraron juegos con ese nombre
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((game, i) => (
            <GameCard
              key={game.id}
              game={game}
              onDelete={handleDelete}
              onRename={handleRename}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
