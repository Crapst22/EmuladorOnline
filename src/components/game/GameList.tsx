'use client'

import { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Search, Download } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { GameCard } from './GameCard'
import { UploadRom } from './UploadRom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/types'
import { motion } from 'framer-motion'

export function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const loadGames = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const { data: ownedGames } = await supabase
      .from('games')
      .select('*')
      .eq('owner_id', user.id)
      .eq('archived', false)
      .order('updated_at', { ascending: false })

    const { data: sessions } = await supabase
      .from('play_sessions')
      .select('game_id')
      .eq('user_id', user.id)

    const playedIds = [...new Set(sessions?.map(s => s.game_id) || [])]

    let playedGames: Game[] = []
    if (playedIds.length > 0) {
      const { data } = await supabase
        .from('games')
        .select('*')
        .in('id', playedIds)
        .order('updated_at', { ascending: false })
      playedGames = data || []
    }

    const merged = [...(ownedGames || [])]
    const seenIds = new Set(merged.map(g => g.id))
    for (const g of playedGames) {
      if (!seenIds.has(g.id)) {
        merged.push(g)
        seenIds.add(g.id)
      }
    }
    setGames(merged)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadGames() }, [loadGames])

  const handleDelete = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: game } = await supabase.from('games').select('owner_id, title').eq('id', id).single()
    if (!game) {
      toast({ variant: 'error', title: 'ERROR', description: 'No se encontró el juego' })
      return
    }
    if (game.owner_id === user.id) {
      const { error } = await supabase.from('games').update({ archived: true }).eq('id', id)
      if (error) {
        toast({ variant: 'error', title: 'ERROR AL ARCHIVAR', description: error.message })
        return
      }
      toast({ variant: 'success', title: 'ARCHIVADO', description: `${game.title} archivado de tu biblioteca` })
    } else {
      const { count } = await supabase
        .from('play_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', id)
        .eq('user_id', user.id)
      if (!count || count === 0) {
        toast({ variant: 'error', title: 'ERROR', description: 'No se encontraron sesiones de juego para eliminar' })
        return
      }
      const { error } = await supabase.from('play_sessions').delete().eq('game_id', id).eq('user_id', user.id)
      if (error) {
        toast({ variant: 'error', title: 'ERROR', description: error.message })
        return
      }
      toast({ variant: 'success', title: 'ELIMINADO', description: `${game.title} eliminado de tu lista` })
    }
    setGames((prev) => prev.filter((g) => g.id !== id))
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
          Sube tus ROMs de Super Nintendo o Game Boy Advance para empezar a jugar desde cualquier dispositivo
        </p>
        <div className="flex gap-2">
          <span className="hidden md:inline-flex">
            <Link href="/juegos">
              <Button variant="outline" className="gap-2 border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/10">
                <Download className="h-4 w-4" />
                JUEGOS CARGADOS
              </Button>
            </Link>
          </span>
          <UploadRom onUploadComplete={loadGames} />
        </div>
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
        <div className="flex gap-2">
          <span className="hidden md:inline-flex">
            <Link href="/juegos">
              <Button variant="outline" className="gap-2 border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/10">
                <Download className="h-4 w-4" />
                JUEGOS CARGADOS
              </Button>
            </Link>
          </span>
          <UploadRom onUploadComplete={loadGames} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 font-retro text-lg text-[#808080]">
          No se encontraron juegos con ese nombre
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((game, i) => (
            <GameCard key={game.id} game={game} onDelete={handleDelete} onRename={handleRename} index={i} userId={userId || undefined} />
          ))}
        </div>
      )}
    </div>
  )
}
