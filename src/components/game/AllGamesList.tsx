'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Gamepad2, Trash2, Edit3, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { SUPPORTED_CONSOLES } from '@/types'
import type { Game } from '@/types'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface GameWithOwner extends Game {
  owner_username?: string
}

export function AllGamesList() {
  const [games, setGames] = useState<GameWithOwner[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const loadGames = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    setIsAdmin(profile?.is_admin || false)

    const { data } = await supabase
      .from('games')
      .select('*, users(username)')
      .order('updated_at', { ascending: false })

    if (data) {
      setGames(data.map((g: any) => ({
        ...g,
        owner_username: g.users?.username || 'Usuario',
      })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadGames() }, [loadGames])

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este juego permanentemente?')) return

    const { data: game } = await supabase.from('games').select('rom_path').eq('id', id).single()
    if (game) {
      await supabase.storage.from('roms').remove([game.rom_path])
    }
    await supabase.from('saves').delete().eq('game_id', id)
    await supabase.from('play_sessions').delete().eq('game_id', id)
    await supabase.from('games').delete().eq('id', id)

    toast({ variant: 'success', title: 'JUEGO ELIMINADO', description: 'El juego fue eliminado correctamente' })
    loadGames()
  }

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return }
    await supabase.from('games').update({ title: editTitle.trim() }).eq('id', id)
    toast({ variant: 'success', title: 'JUEGO RENOMBRADO', description: 'El nombre fue actualizado' })
    setEditingId(null)
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
        <h3 className="font-pixel text-[0.7rem] text-[#FFD700] mb-4">NO HAY JUEGOS DISPONIBLES</h3>
        <p className="font-retro text-base text-[#A0A0A0] mb-6 max-w-sm">
          Aun no se han subido juegos a la plataforma
        </p>
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
        <p className="font-retro text-sm text-[#808080]">{games.length} juegos en total</p>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 font-retro text-lg text-[#808080]">
          No se encontraron juegos con ese nombre
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="group cursor-pointer border-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all duration-200 hover:translate-y-[-3px]"
                onClick={() => router.push(`/play/${game.id}`)}
              >
                <div className="aspect-video bg-gradient-to-br from-[#301934] to-[#0A0A2E] flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 border-2 border-[#FFD700]/30 bg-[#050510]/50 flex items-center justify-center group-hover:bg-[#FFD700]/10 group-hover:border-[#FFD700]/60 transition-all">
                      <Gamepad2 className="h-8 w-8 text-[#FFD700]" />
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                      onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-[#050510]/80 hover:bg-[#050510] border border-[#FFD700]/20 rounded-none"
                        onClick={() => { setEditingId(game.id); setEditTitle(game.title) }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-[#050510]/80 hover:bg-[#FF2400]/20 hover:text-[#FF2400] border border-[#FFD700]/20 rounded-none"
                        onClick={() => handleDelete(game.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#050510]/80 border border-[#FFD700]/20 text-[0.5rem] font-retro text-[#A0A0A0]">
                      <User className="h-3 w-3" />
                      {game.owner_username}
                    </span>
                  </div>
                </div>
                <CardContent className="p-3">
                  {editingId === game.id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(game.id); if (e.key === 'Escape') setEditingId(null) }}
                        onBlur={() => handleRename(game.id)} className="h-8 text-sm rounded-none" autoFocus />
                    </div>
                  ) : (
                    <h3 className="font-pixel text-[0.5rem] text-[#E0E0E0] leading-relaxed truncate">{game.title}</h3>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="retro-radar">
                      <div className="retro-radar-dot" />
                    </div>
                    <p className="font-retro text-sm text-[#808080]">{SUPPORTED_CONSOLES[game.console_type]?.name?.toUpperCase() || 'SNES'}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
