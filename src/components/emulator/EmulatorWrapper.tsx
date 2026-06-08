'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSync } from '@/hooks/useSync'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useDevice } from '@/hooks/useDevice'
import { useGamepad } from '@/hooks/useGamepad'
import { SyncIndicator } from './SyncIndicator'
import { TouchControls } from './TouchControls'
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
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const { syncStatus, uploadSave, downloadLatestSave } = useSync(game.id)
  const { isMobile } = useDevice()
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
      window.EJS_core = 'snes9x'
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
      script.onload = () => {
        setLoaded(true)
      }
      script.onerror = () => {
        setError('Error al cargar el emulador')
      }
      document.body.appendChild(script)

      const checkEmulator = setInterval(() => {
        const emu = (window as any).EJS_emulator
        if (emu) {
          emulatorRef.current = emu
          emu.on('exit', () => {
            emu.saveSettings?.()
            router.push('/dashboard')
          })
          clearInterval(checkEmulator)
        }
      }, 100)

      const saveOnUnload = () => {
        const emu = (window as any).EJS_emulator
        emu?.saveSettings?.()
      }
      window.addEventListener('beforeunload', saveOnUnload)
      cleanups.push(() => window.removeEventListener('beforeunload', saveOnUnload))
    })

    return () => {
      for (const fn of cleanups) fn()
      const emu = (window as any).EJS_emulator
      if (emu) {
        emu.saveSettings?.()
        if (emu.destroy) {
          emu.destroy()
        }
      }
      emulatorRef.current = null
      initialized.current = false
    }
  }, [romUrl, downloadLatestSave, router])

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-400">
        <div className="text-center">
          <p className="text-lg mb-2">{error}</p>
          <p className="text-sm text-zinc-500">Asegúrate de que EmulatorJS está en public/emulatorjs/</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">{game.title}</h2>
          <div className="flex items-center gap-3">
            {gamepadConnected && (
              <span className="text-xs text-green-400">Gamepad conectado</span>
            )}
            <SyncIndicator status={syncStatus} />
          </div>
        </div>

        <div className="w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl min-h-[400px]">
          <div id="game-emulator" />
        </div>

        {!loaded && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        )}
      </div>

      {isMobile && <TouchControls />}
    </div>
  )
}
