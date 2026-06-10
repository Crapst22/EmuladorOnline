'use client'

import { useEffect, useState } from 'react'
import { GameList } from '@/components/game/GameList'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  gameCount: number
  totalMinutes: number
  lastSession: { started_at: string; game_title: string } | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ gameCount: 0, totalMinutes: 0, lastSession: null })
  const supabase = createClient()

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [ownedCount, { data: sessions }, { data: playedIds }] = await Promise.all([
        supabase.from('games').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('archived', false),
        supabase.from('play_sessions').select('started_at, ended_at, game_id').eq('user_id', user.id).order('started_at', { ascending: false }),
        supabase.from('play_sessions').select('game_id').eq('user_id', user.id),
      ])

      const uniquePlayedIds = [...new Set(playedIds?.map(s => s.game_id) || [])]

      let gameCount = ownedCount.count || 0
      if (uniquePlayedIds.length > 0) {
        const { count: playedCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .in('id', uniquePlayedIds)
          .neq('owner_id', user.id)
        gameCount += playedCount || 0
      }

      let totalMinutes = 0
      let lastSession: DashboardStats['lastSession'] = null

      if (sessions) {
        for (const s of sessions) {
          if (s.ended_at) {
            const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
            totalMinutes += Math.floor(diff / 60000)
          }
        }
        const first = sessions[0]
        if (first?.started_at) {
          const { data: game } = await supabase.from('games').select('title').eq('id', first.game_id).single()
          lastSession = { started_at: first.started_at, game_title: game?.title || 'Juego' }
        }
      }

      setStats({ gameCount: gameCount ?? 0, totalMinutes, lastSession })
    }
    loadStats()
  }, [supabase])

  function formatHours(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  function formatLastSession(session: DashboardStats['lastSession']): string {
    if (!session) return '-'
    const d = new Date(session.started_at)
    const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return `${session.game_title} - ${date}`
  }

  return (
    <div className="space-y-8 py-6">
      <div className="retro-panel p-5 retro-speed-lines">
        <div className="flex items-center gap-3 mb-1">
          <img src="/favicon-symbol.png" alt="" className="h-8 w-8" />
          <h1 className="font-pixel text-[0.8rem] text-[#FFD700] tracking-wider retro-glow">
            MI BIBLIOTECA
          </h1>
        </div>
        <p className="font-retro text-base text-[#A0A0A0] ml-8">
          Tus ROMs y partidas guardadas
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="retro-panel-dark p-4 relative">
          <div className="retro-corner-tl" />
          <div className="retro-corner-tr" />
          <div className="retro-corner-bl" />
          <div className="retro-corner-br" />
          <p className="font-pixel text-[0.5rem] text-[#808080] tracking-wider mb-1">{'\u25B2'} JUEGOS</p>
          <p className="font-pixel text-[1.2rem] text-[#FFD700]">{stats.gameCount}</p>
        </div>
        <div className="retro-panel-dark p-4 relative">
          <div className="retro-corner-tl" />
          <div className="retro-corner-tr" />
          <div className="retro-corner-bl" />
          <div className="retro-corner-br" />
          <p className="font-pixel text-[0.5rem] text-[#808080] tracking-wider mb-1">{'\u25B6'} HORAS JUGADAS</p>
          <p className="font-pixel text-[1.2rem] text-[#FFD700]">{formatHours(stats.totalMinutes)}</p>
        </div>
        <div className="retro-panel-dark p-4 relative">
          <div className="retro-corner-tl" />
          <div className="retro-corner-tr" />
          <div className="retro-corner-bl" />
          <div className="retro-corner-br" />
          <p className="font-pixel text-[0.5rem] text-[#808080] tracking-wider mb-1">{'\u2605'} ULTIMA SESION</p>
          <p className="font-pixel text-[0.55rem] text-[#FFD700] leading-relaxed">{formatLastSession(stats.lastSession)}</p>
        </div>
      </div>
      <GameList />
    </div>
  )
}
