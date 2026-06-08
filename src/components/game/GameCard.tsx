'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trash2, Play, Edit3 } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  index: number
}

export function GameCard({ game, onDelete, onRename, index }: GameCardProps) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="game-card-hover group cursor-pointer border-zinc-800/50 overflow-hidden" onClick={() => router.push(`/play/${game.id}`)}>
        <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
              <Play className="h-8 w-8 text-purple-400 ml-1" />
            </div>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
            onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/50 hover:bg-black/70"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/50 hover:bg-red-500/20 hover:text-red-400"
              onClick={() => onDelete(game.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-3">
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
                onBlur={handleRename}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <h3 className="font-medium text-sm text-white truncate">{game.title}</h3>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            SNES
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
