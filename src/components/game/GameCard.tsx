'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trash2, Play, Edit3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { SUPPORTED_CONSOLES } from '@/types'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  index: number
  userId?: string
}

export function GameCard({ game, onDelete, onRename, index, userId }: GameCardProps) {
  const isOwned = game.owner_id === userId
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [newTitle, setNewTitle] = useState(game.title)

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== game.title) {
      onRename(game.id, newTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="group cursor-pointer border-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all duration-200 hover:translate-y-[-3px]"
        onClick={() => router.push(`/play/${game.id}`)}
      >
        <div className="aspect-video bg-gradient-to-br from-[#301934] to-[#0A0A2E] flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 border-2 border-[#FFD700]/30 bg-[#050510]/50 flex items-center justify-center group-hover:bg-[#FFD700]/10 group-hover:border-[#FFD700]/60 transition-all">
              <Play className="h-8 w-8 text-[#FFD700] ml-1" />
            </div>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
            onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-[#050510]/80 hover:bg-[#050510] border border-[#FFD700]/20 rounded-none"
              onClick={() => setIsEditing(!isEditing)}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-[#050510]/80 hover:bg-[#FF2400]/20 hover:text-[#FF2400] border border-[#FFD700]/20 rounded-none"
              onClick={() => onDelete(game.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-3">
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false) }}
                onBlur={handleRename} className="h-8 text-sm rounded-none" autoFocus />
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
  )
}
