'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSync } from '@/hooks/useSync'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useGamepad } from '@/hooks/useGamepad'
import { SyncIndicator } from './SyncIndicator'
import { createClient } from '@/lib/supabase/client'
import { SUPPORTED_CONSOLES } from '@/types'
import type { Game } from '@/types'

declare global {
  interface Window {
    EJS_player: string
    EJS_core: string
    EJS_gameUrl: string
    EJS_pathtodata: string
    EJS_language: string
    EJS_disableAutoLang: boolean
    EJS_emulator?: any
    EJS_softLoad?: (url: string) => void
    EJS_startOnLoaded?: boolean
    EJS_loadStateURL?: string
    EJS_gameID?: string
  }
}

interface EmulatorWrapperProps {
  game: Game
  romUrl: string
}

export function EmulatorWrapper({ game, romUrl }: EmulatorWrapperProps) {
  const router = useRouter()
  const initialized = useRef(false)
  const emulatorRef = useRef<any>(null)
  const sessionIdRef = useRef<string | null>(null)
  const supabaseRef = useRef(createClient())
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const { syncStatus, uploadSave, downloadLatestSave } = useSync(game.id)
  const { gamepadConnected } = useGamepad()

  const handleSave = useCallback(async () => {
    const emu = (window as any).EJS_emulator
    if (!emu?.gameManager) return
    try {
      const srm = emu.gameManager.getSaveFile(false)
      if (srm) {
        const blob = new Blob([srm], { type: 'application/octet-stream' })
        await uploadSave(blob, 'srm')
      }
      const state = emu.gameManager.getState()
      if (state) {
        const blob = new Blob([state], { type: 'application/octet-stream' })
        await uploadSave(blob, 'state')
      }
    } catch {}
    emu.saveSettings?.()
  }, [uploadSave])

  useAutoSave({ gameId: game.id, onSave: handleSave, enabled: loaded })

  useEffect(() => {
    if (!romUrl) return
    if (initialized.current) return
    initialized.current = true

    const cleanups: (() => void)[] = []

    downloadLatestSave('state').then((stateBlob) => {
      window.EJS_player = '#game-emulator'
      window.EJS_core = SUPPORTED_CONSOLES[game.console_type]?.emulatorCore || 'snes9x'
      window.EJS_gameUrl = romUrl
      window.EJS_pathtodata = '/emulatorjs/'
      window.EJS_language = 'es-ES'
      window.EJS_disableAutoLang = false
      window.EJS_startOnLoaded = true
      window.EJS_gameID = game.id

      if (stateBlob) {
        window.EJS_loadStateURL = URL.createObjectURL(stateBlob)
      }

      const script = document.createElement('script')
      script.src = '/emulatorjs/loader.js'
      script.async = false
      script.onload = async () => {
        setLoaded(true)
        const { data: { user } } = await supabaseRef.current.auth.getUser()
        if (user) {
          const { data: existing } = await supabaseRef.current
            .from('play_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('game_id', game.id)
            .is('ended_at', null)
            .maybeSingle()

          if (existing) {
            sessionIdRef.current = existing.id
          } else {
            const { data: sessionData } = await supabaseRef.current
              .from('play_sessions')
              .insert({ user_id: user.id, game_id: game.id })
              .select('id')
              .single()
            if (sessionData) sessionIdRef.current = sessionData.id
          }
        }
      }
      script.onerror = () => { setError('Error al cargar el emulador') }
      document.body.appendChild(script)

      const checkEmulator = setInterval(() => {
        const emu = (window as any).EJS_emulator
        if (emu) {
          emulatorRef.current = emu
          emu.on('exit', async () => {
            emu.saveSettings?.()
            if (sessionIdRef.current) {
              await supabaseRef.current.from('play_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionIdRef.current)
            }
            router.push('/dashboard')
          })
          clearInterval(checkEmulator)
        }
      }, 100)

      const saveOnUnload = () => {
        const emu = (window as any).EJS_emulator
        emu?.saveSettings?.()
        if (sessionIdRef.current) {
          supabaseRef.current.from('play_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionIdRef.current).then()
        }
      }
      window.addEventListener('beforeunload', saveOnUnload)
      cleanups.push(() => window.removeEventListener('beforeunload', saveOnUnload))
    })

    return () => {
      for (const fn of cleanups) fn()
      if (sessionIdRef.current) {
        supabaseRef.current.from('play_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionIdRef.current).then()
      }
      const emu = (window as any).EJS_emulator
      if (emu) {
        emu.saveSettings?.()
        if (emu.destroy) emu.destroy()
      }
      emulatorRef.current = null
      initialized.current = false
    }
  }, [romUrl, downloadLatestSave, router])

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="retro-panel p-8 text-center">
          <p className="font-pixel text-[0.7rem] text-[#FF2400] mb-2">{error}</p>
          <p className="font-retro text-sm text-[#808080]">Asegurate de que EmulatorJS esta en public/emulatorjs/</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Console top bar */}
        <div className="retro-panel p-3 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#50C878] rounded-full shadow-[0_0_4px_rgba(80,200,120,0.5)]" />
            <h2 className="font-pixel text-[0.55rem] text-[#FFD700] tracking-wider truncate max-w-[200px]">
              {game.title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {gamepadConnected && (
              <span className="font-pixel text-[0.4rem] text-[#50C878] retro-radar">
                <div className="retro-radar-dot" />
                GAMEPAD
              </span>
            )}
            <SyncIndicator status={syncStatus} />
          </div>
        </div>
        {/* Console frame */}
        <div className="retro-panel p-1">
          <div className="bg-black border-2 border-[#FFD700]/20">
            <div id="game-emulator" className="min-h-[400px]" />
          </div>
        </div>
        {/* Controls bar */}
        <div className="retro-panel-dark p-3 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#FF2400] rounded-full animate-pulse" />
            <span className="font-pixel text-[0.4rem] text-[#808080]">{SUPPORTED_CONSOLES[game.console_type]?.name?.toUpperCase() || 'SNES'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[0.4rem] text-[#808080]">RETROCLOUD</span>
            <div className="retro-clock" />
          </div>
        </div>
        {!loaded && (
          <div className="flex items-center justify-center py-12">
            <div className="retro-spinner" />
          </div>
        )}
      </div>
    </div>
  )
}
