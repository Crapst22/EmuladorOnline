'use client'

import { Trophy } from 'lucide-react'

interface GameCompletedToggleProps {
  gameId: string
  completed: boolean
  onToggleCompleted: (gameId: string) => void
}

export function GameCompletedToggle({ gameId, completed, onToggleCompleted }: GameCompletedToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={completed}
      aria-label={completed ? 'Marcar juego como no terminado' : 'Marcar juego como terminado'}
      title={completed ? 'Terminaste este juego. Clic para desmarcar' : 'Marcá si ya terminaste este juego'}
      onClick={(e) => {
        e.stopPropagation()
        onToggleCompleted(gameId)
      }}
      className={`z-10 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-2 transition-all ${
        completed
          ? 'border-[#FFE44D] bg-gradient-to-b from-[#FFD700] to-[#B8960F] text-[#050510] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.2)]'
          : 'border-[#FFD700]/30 bg-[#050510]/80 text-[#FFD700]/40 hover:border-[#FFD700]/70 hover:text-[#FFD700]'
      }`}
    >
      <Trophy className={`h-4 w-4 fill-current ${completed ? '' : 'opacity-80'}`} />
    </button>
  )
}