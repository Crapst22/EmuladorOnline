'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SavePanelProps {
  gameId: string
  onLoadState: (data: ArrayBuffer) => void
}

interface SaveEntry {
  id: string
  version: number
  created_at: string
  save_path: string
}

export function SavePanel({ gameId, onLoadState }: SavePanelProps) {
  const [saves, setSaves] = useState<SaveEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSaves()
  }, [])

  async function loadSaves() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('saves')
      .select('id, version, created_at, save_path')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .eq('save_type', 'state')
      .order('version', { ascending: false })
      .limit(3)

    if (data) setSaves(data)
    setLoading(false)
  }

  async function handleLoad(save: SaveEntry) {
    setLoadingId(save.id)
    const { data } = await supabase.storage.from('saves').download(save.save_path)
    if (data) {
      onLoadState(await data.arrayBuffer())
    }
    setLoadingId(null)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="retro-panel p-3 mt-4">
      <h3 className="font-pixel text-[0.5rem] text-[#FFD700] mb-3 tracking-wider">
        ÚLTIMOS GUARDADOS AUTOMÁTICOS
      </h3>

      {loading && (
        <div className="flex items-center gap-2">
          <div className="retro-spinner w-4 h-4" />
          <span className="font-retro text-xs text-[#808080]">Cargando...</span>
        </div>
      )}

      {!loading && saves.length === 0 && (
        <p className="font-retro text-xs text-[#808080]">
          No hay guardados automáticos disponibles
        </p>
      )}

      <div className="space-y-2">
        {saves.map((save, i) => (
          <div
            key={save.id}
            className="flex items-center justify-between retro-panel-dark p-2 rounded"
          >
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[0.4rem] text-[#50C878] min-w-[3.5rem]">
                SLOT {i + 1}
              </span>
              <span className="font-retro text-xs text-[#C0C0C0]">
                {formatDate(save.created_at)}
              </span>
            </div>
            <button
              onClick={() => handleLoad(save)}
              disabled={loadingId === save.id}
              className="font-pixel text-[0.4rem] text-[#FFD700] hover:text-[#FF2400] disabled:text-[#404040] disabled:cursor-not-allowed transition-colors"
            >
              {loadingId === save.id ? 'CARGANDO...' : 'CARGAR'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
