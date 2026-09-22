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
      className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border transition-all ${
        completed
          ? 'border-[#FFD700] bg-[#FFD700] text-[#050510]'
          : 'border-[#FFD700]/30 bg-[#050510]/80 text-[#FFD700]/40 hover:border-[#FFD700]/70 hover:text-[#FFD700]'
      }`}
    >
      <Trophy className="h-3.5 w-3.5" />
    </button>
  )
}