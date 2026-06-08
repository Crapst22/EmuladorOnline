'use client'

import { useCallback } from 'react'

interface ButtonConfig {
  label: string
  gameKey: string
  color: string
  size: 'sm' | 'md' | 'lg'
}

const DPAD_BUTTONS: ButtonConfig[] = [
  { label: '▲', gameKey: 'ArrowUp', color: 'bg-zinc-700/80', size: 'md' },
  { label: '◄', gameKey: 'ArrowLeft', color: 'bg-zinc-700/80', size: 'md' },
  { label: '▼', gameKey: 'ArrowDown', color: 'bg-zinc-700/80', size: 'md' },
  { label: '►', gameKey: 'ArrowRight', color: 'bg-zinc-700/80', size: 'md' },
]

const ACTION_BUTTONS: ButtonConfig[] = [
  { label: 'Y', gameKey: 's', color: 'bg-amber-500/80', size: 'sm' },
  { label: 'B', gameKey: 'x', color: 'bg-red-500/80', size: 'lg' },
  { label: 'A', gameKey: 'z', color: 'bg-green-500/80', size: 'lg' },
  { label: 'X', gameKey: 'a', color: 'bg-blue-500/80', size: 'sm' },
]

const SHOULDER_BUTTONS: ButtonConfig[] = [
  { label: 'L', gameKey: 'q', color: 'bg-purple-600/80', size: 'sm' },
  { label: 'R', gameKey: 'w', color: 'bg-purple-600/80', size: 'sm' },
]

const MISC_BUTTONS: ButtonConfig[] = [
  { label: 'Select', gameKey: 'Shift', color: 'bg-zinc-600/80', size: 'sm' },
  { label: 'Start', gameKey: 'Enter', color: 'bg-zinc-600/80', size: 'sm' },
]

function dispatchKey(key: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }))
}

function TouchButton({ label, gameKey, color, size }: ButtonConfig) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'md' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dispatchKey(gameKey, 'keydown')
  }, [gameKey])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dispatchKey(gameKey, 'keyup')
  }, [gameKey])

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dispatchKey(gameKey, 'keyup')
  }, [gameKey])

  return (
    <button
      className={`${sizeClass} ${color} rounded-xl flex items-center justify-center font-bold text-white select-none touch-none active:scale-90 transition-transform shadow-lg backdrop-blur-sm`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

export function TouchControls() {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden select-none touch-none">
      <div className="flex justify-between px-4 pb-2">
        <div className="relative w-36 h-36">
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <TouchButton label={DPAD_BUTTONS[0].label} gameKey={DPAD_BUTTONS[0].gameKey} color={DPAD_BUTTONS[0].color} size={DPAD_BUTTONS[0].size} />
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <TouchButton label={DPAD_BUTTONS[1].label} gameKey={DPAD_BUTTONS[1].gameKey} color={DPAD_BUTTONS[1].color} size={DPAD_BUTTONS[1].size} />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <TouchButton label={DPAD_BUTTONS[2].label} gameKey={DPAD_BUTTONS[2].gameKey} color={DPAD_BUTTONS[2].color} size={DPAD_BUTTONS[2].size} />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <TouchButton label={DPAD_BUTTONS[3].label} gameKey={DPAD_BUTTONS[3].gameKey} color={DPAD_BUTTONS[3].color} size={DPAD_BUTTONS[3].size} />
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex gap-2 mb-2">
            {SHOULDER_BUTTONS.map((btn) => (
              <TouchButton key={btn.gameKey} label={btn.label} gameKey={btn.gameKey} color={btn.color} size={btn.size} />
            ))}
          </div>
          <div className="flex gap-2">
            {ACTION_BUTTONS.slice(0, 2).map((btn) => (
              <TouchButton key={btn.gameKey} label={btn.label} gameKey={btn.gameKey} color={btn.color} size={btn.size} />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            {ACTION_BUTTONS.slice(2).map((btn) => (
              <TouchButton key={btn.gameKey} label={btn.label} gameKey={btn.gameKey} color={btn.color} size={btn.size} />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            {MISC_BUTTONS.map((btn) => (
              <TouchButton key={btn.gameKey} label={btn.label} gameKey={btn.gameKey} color={btn.color} size={btn.size} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
