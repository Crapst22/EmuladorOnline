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
    EJS_gameName?: string
    EJS_defaultOptions?: Record<string, string>
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
    console.log('[Save] ======= handleSave INICIADO =======')
    const emu = (window as any).EJS_emulator
    if (!emu?.gameManager) {
      console.warn('[Save] emu.gameManager no disponible')
      return
    }
    try {
      console.log('[Save] Llamando getSaveFile()...')
      const srm = emu.gameManager.getSaveFile()
      console.log('[Save] getSaveFile() retornó:', srm ? `Blob(${srm.length} bytes)` : 'null')
      if (srm) {
        const blob = new Blob([srm], { type: 'application/octet-stream' })
        await uploadSave(blob, 'srm')
        console.log('[Save] SRM subida OK, size:', srm.length)
      } else {
        console.warn('[Save] SRM no encontrada (getSaveFile retornó null)')
        console.warn('[Save] saveFilePath:', emu.gameManager.getSaveFilePath())
      }
    } catch (e) {
      console.error('[Save] Error al obtener SRM:', e)
    }
    try {
      const state = emu.gameManager.getState()
      if (state) {
        const blob = new Blob([state], { type: 'application/octet-stream' })
        await uploadSave(blob, 'state')
        console.log('[Save] State subido OK, size:', state.length)
      }
    } catch (e) {
      console.error('[Save] Error al obtener state:', e)
    }
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

  // Gamepad strategy:
  //   The native GamepadHandler dispatches events with `gamepadIndex`
  //   but gamepadEvent expects `event.gamepad.id`. This mismatch causes
  //   "Cannot read properties of undefined (reading 'id')".
  //   We patch dispatchEvent on the native handler to inject
  //   `gamepad: { id }` so gamepadEvent works correctly.

  useEffect(() => {
    if (!loaded) return
    const gameKeys = Object.keys(SUPPORTED_CONSOLES[game.console_type]?.controls || {})
    const keysToBlock = new Set([...gameKeys, ' '])
    const handleKeyDown = (e: KeyboardEvent) => {
      if (keysToBlock.has(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [loaded, game.console_type])

  useEffect(() => {
    if (!romUrl) return
    if (initialized.current) return
    initialized.current = true

    const cleanups: (() => void)[] = []
    let srmInjected = false
    let stateData: Uint8Array | null = null

    Promise.all([
      downloadLatestSave('srm'),
      downloadLatestSave('state'),
    ]).then(async ([srmBlob, stateBlob]) => {
      let srmData: Uint8Array | null = null
      if (srmBlob) {
        srmData = new Uint8Array(await srmBlob.arrayBuffer())
      }
      if (stateBlob) {
        stateData = new Uint8Array(await stateBlob.arrayBuffer())
      }

      window.EJS_player = '#game-emulator'
      window.EJS_core = SUPPORTED_CONSOLES[game.console_type]?.emulatorCore || 'snes9x'
      window.EJS_gameUrl = romUrl
      window.EJS_pathtodata = '/emulatorjs/'
      window.EJS_language = 'es-ES'
      window.EJS_disableAutoLang = false
      window.EJS_startOnLoaded = true
      window.EJS_gameID = game.id
      window.EJS_gameName = game.id
      window.EJS_defaultOptions = window.EJS_defaultOptions || {}
      if (game.console_type === 'n64') {
        window.EJS_defaultOptions['mupen64plus-savetype'] = 'auto'
      }

      if (document.querySelector('script[src="/emulatorjs/loader.js"]')) {
        return
      }

      // Patch native GamepadHandler dispatchEvent to inject gamepad.id
      // The native code sends { index, label, gamepadIndex } but
      // gamepadEvent expects event.gamepad.id, causing a crash.
      let _EJS_emulator: any
      Object.defineProperty(window, 'EJS_emulator', {
        configurable: true,
        enumerable: true,
        get() { return _EJS_emulator },
        set(val: any) {
          _EJS_emulator = val
          if (val?.gamepad?.dispatchEvent) {
            const orig = val.gamepad.dispatchEvent.bind(val.gamepad)
            val.gamepad.dispatchEvent = (name: string, arg: any) => {
              if (arg && arg.gamepadIndex != null)
                arg.gamepad = { id: arg.gamepadIndex }
              return orig(name, arg)
            }
          }
        },
      })

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

          const tryInjectSRM = (attempt = 0) => {
            if (!srmData || srmInjected || !emu.gameManager) return
            srmInjected = true
            try {
              const saveFilePath = emu.gameManager.getSaveFilePath()
              console.log('[Start] saveFilePath:', saveFilePath)
              let injected = false
              try {
                emu.gameManager.writeFile(saveFilePath, srmData)
                injected = true
                console.log('[Start] SRM escrita en:', saveFilePath)
              } catch (e) {
                console.warn('[Start] Ruta principal no válida:', e)
              }
              const altExtensions = ['.srm', '.eep', '.sra', '.fla']
              const basePath = saveFilePath ? saveFilePath.replace(/\.\w+$/, '') : '/data/saves/save'
              for (const ext of altExtensions) {
                const altPath = basePath + ext
                if (altPath === saveFilePath) continue
                try {
                  emu.gameManager.writeFile(altPath, srmData)
                  injected = true
                  console.log('[Start] SRM escrita en alt:', altPath)
                } catch (e) {}
              }
              if (injected) {
                emu.gameManager.loadSaveFiles()
                console.log('[Start] loadSaveFiles OK')
              } else {
                throw new Error('No se pudo escribir la save en ninguna ruta')
              }
            } catch (e: any) {
              srmInjected = false
              console.error('[Start] Error inyectar SRM (intento ' + attempt + '):', e)
              if (attempt < 5) {
                setTimeout(() => tryInjectSRM(attempt + 1), 1000)
              } else {
                setWarning('No se pudo restaurar el guardado automático. Debajo tenés los últimos 3 savestates con fecha y hora para cargar manualmente.')
              }
            }
          }

          const tryLoadState = () => {
            if (!stateData || !emu.gameManager) {
              console.log('[Start] tryLoadState saltado (sin stateData o sin gameManager)')
              return
            }
            console.log('[Start] Programando carga de state en 2s, size:', stateData.length)
            setTimeout(() => {
              try {
                emu.gameManager.loadState(stateData!)
                console.log('[Start] Save state auto-cargado OK')
              } catch (e) {
                console.warn('[Start] Error al auto-cargar state:', e)
              }
            }, 2000)
          }

          const configureN64Save = () => {
            if (game.console_type !== 'n64' || !emu.gameManager) return
            try {
              emu.gameManager.setVariable('mupen64plus-savetype', 'auto')
              console.log('[Start] N64 savetype configurado a auto')
            } catch (e) {
              console.warn('[Start] No se pudo configurar N64 savetype:', e)
            }
          }

          emu.on('start', () => {
            console.log('[Start] Evento START disparado')
            configureN64Save()
            tryInjectSRM(0)
            tryLoadState()
          })

          emu.on('exit', async () => {
            await handleSave()
            emu.saveSettings?.()
            if (sessionIdRef.current) {
              await closePlaySession(sessionIdRef.current)
            }
            router.push('/dashboard')
          })

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
