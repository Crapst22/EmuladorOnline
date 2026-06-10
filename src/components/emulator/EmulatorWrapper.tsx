'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSync } from '@/hooks/useSync'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useGamepad } from '@/hooks/useGamepad'
import { SyncIndicator } from './SyncIndicator'
import { SavePanel } from './SavePanel'
import { createClient } from '@/lib/supabase/client'
import { closePlaySession, pingLastSeen } from '@/lib/storage/roms'
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
  const [loadError, setLoadError] = useState('')
  const [warning, setWarning] = useState('')
  const { syncStatus, uploadSave, downloadLatestSave } = useSync(game.id)
  const { gamepadConnected } = useGamepad()

  const handleSave = useCallback(async () => {
    const emu = (window as any).EJS_emulator
    if (!emu?.gameManager) return
    try {
      const srm = emu.gameManager.getSaveFile()
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

  const handleLoadState = useCallback(async (arrayBuffer: ArrayBuffer) => {
    const emu = (window as any).EJS_emulator
    if (!emu?.gameManager) return
    try {
      emu.gameManager.loadState(new Uint8Array(arrayBuffer))
    } catch (e) {
      console.error('Error al cargar savestate:', e)
    }
  }, [])

  useAutoSave({ gameId: game.id, onSave: handleSave, enabled: loaded })

  useEffect(() => {
    if (!romUrl) return
    if (initialized.current) return
    initialized.current = true

    const cleanups: (() => void)[] = []
    let srmInjected = false

    downloadLatestSave('srm').then(async (srmBlob) => {
      let srmData: Uint8Array | null = null
      if (srmBlob) {
        srmData = new Uint8Array(await srmBlob.arrayBuffer())
      }

      window.EJS_player = '#game-emulator'
      window.EJS_core = SUPPORTED_CONSOLES[game.console_type]?.emulatorCore || 'snes9x'
      window.EJS_gameUrl = romUrl
      window.EJS_pathtodata = '/emulatorjs/'
      window.EJS_language = 'es-ES'
      window.EJS_disableAutoLang = false
      window.EJS_startOnLoaded = true
      window.EJS_gameID = game.id

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

        const pingInterval = setInterval(() => pingLastSeen(), 8_000)
        cleanups.push(() => clearInterval(pingInterval))
      }
      script.onerror = () => { setError('Error al cargar el emulador') }
      document.body.appendChild(script)

      const checkEmulator = setInterval(() => {
        const emu = (window as any).EJS_emulator
        if (emu) {
          emulatorRef.current = emu

          async function injectSRM() {
            if (!srmData || srmInjected) return
            srmInjected = true
            try {
              const saveFilePath = emu.gameManager.getSaveFilePath()
              const parts = saveFilePath.split('/')
              let current = ''
              for (let i = 0; i < parts.length - 1; i++) {
                if (!parts[i]) continue
                current += '/' + parts[i]
                if (!emu.gameManager.FS.analyzePath(current).exists) {
                  emu.gameManager.FS.mkdir(current)
                }
              }
              if (emu.gameManager.FS.analyzePath(saveFilePath).exists) {
                emu.gameManager.FS.unlink(saveFilePath)
              }
              emu.gameManager.FS.writeFile(saveFilePath, srmData)
              emu.gameManager.loadSaveFiles()
            } catch (e) {
              srmInjected = false
              console.error('Error al inyectar SRM:', e)
              setWarning('No se pudo restaurar el guardado de batería. Usa los guardados del panel inferior si es necesario.')
            }
          }

          emu.on('start', injectSRM)

          emu.on('exit', async () => {
            await handleSave()
            emu.saveSettings?.()
            if (sessionIdRef.current) {
              await closePlaySession(sessionIdRef.current)
            }
            router.push('/dashboard')
          })

          injectSRM()

          clearInterval(checkEmulator)
        }
      }, 100)
      cleanups.push(() => clearInterval(checkEmulator))

      const saveOnUnload = () => {
        handleSave()
        const emu = (window as any).EJS_emulator
        emu?.saveSettings?.()
        if (sessionIdRef.current) {
          closePlaySession(sessionIdRef.current)
        }
      }
      window.addEventListener('beforeunload', saveOnUnload)
      cleanups.push(() => window.removeEventListener('beforeunload', saveOnUnload))
    }).catch((err: Error) => {
      setLoadError(err.message || 'Error al cargar los datos de la partida. Recarga la página para intentarlo de nuevo.')
      initialized.current = false
    })

    return () => {
      for (const fn of cleanups) fn()
      if (sessionIdRef.current) {
        closePlaySession(sessionIdRef.current)
      }
      const emu = (window as any).EJS_emulator
      if (emu) {
        emu.saveSettings?.()
        if (emu.destroy) emu.destroy()
      }
      emulatorRef.current = null
      initialized.current = false
    }
  }, [romUrl, downloadLatestSave, router, handleSave])

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="retro-panel p-8 text-center max-w-lg">
          <p className="font-pixel text-[0.7rem] text-[#FF2400] mb-4">{loadError}</p>
          <p className="font-retro text-sm text-[#808080] mb-6">Los datos guardados anteriores están a salvo en la nube. Una vez que recargues, el sistema intentará cargarlos de nuevo.</p>
          <button
            onClick={() => window.location.reload()}
            className="font-pixel text-[0.55rem] text-[#50C878] hover:text-[#FFD700] underline cursor-pointer transition-colors"
          >
            REINTENTar
          </button>
        </div>
      </div>
    )
  }

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
        {warning && (
          <div className="retro-panel-dark p-2 mb-2 rounded">
            <p className="font-pixel text-[0.4rem] text-[#FFD700] text-center">{warning}</p>
          </div>
        )}
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

        {loaded && (
          <SavePanel gameId={game.id} onLoadState={handleLoadState} />
        )}
      </div>
    </div>
  )
}
