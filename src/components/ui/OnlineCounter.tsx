'use client'

import { useEffect, useState, useCallback } from 'react'
import { getOnlineUsers, type OnlineUser } from '@/lib/storage/roms'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export default function OnlineCounter() {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [othersOnline, setOthersOnline] = useState(0)
  const [myId, setMyId] = useState<string | null>(null)

  const fetchOnline = useCallback(async () => {
    const { online } = await getOnlineUsers()
    setUsers(online)
    const currentUserId = localStorage.getItem('retrocloud-user-id')
    setMyId(currentUserId)
  }, [])

  useEffect(() => {
    const storeUserId = async () => {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) localStorage.setItem('retrocloud-user-id', user.id)
    }
    storeUserId()
  }, [])

  useEffect(() => {
    fetchOnline()
    const interval = setInterval(fetchOnline, 30_000)
    return () => clearInterval(interval)
  }, [fetchOnline])

  useEffect(() => {
    const count = myId ? users.filter((u) => u.id !== myId).length : 0
    setOthersOnline(count)
  }, [users, myId])

  const isGreen = othersOnline > 0

  const others = myId ? users.filter((u) => u.id !== myId) : users

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 font-retro text-sm text-[#A0A0A0] hover:text-[#FFD700] transition-colors"
      >
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full border ${
            isGreen
              ? 'bg-green-400 border-green-300 shadow-[0_0_6px_rgba(74,222,128,0.6)]'
              : 'bg-gray-500 border-gray-400'
          }`}
        />
        {othersOnline} conectados ahora
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>CONECTADOS AHORA</DialogTitle>
          </DialogHeader>
          <Separator />
          {others.length === 0 ? (
            <p className="font-retro text-sm text-[#808080] text-center py-6">
              No hay nadie más conectado
            </p>
          ) : (
            <ScrollArea className="max-h-72">
              <div className="space-y-3 pr-3">
                {others.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 font-pixel text-[0.55rem] text-[#FFD700]">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        u.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-retro text-sm text-white truncate">
                        {u.current_game ? (
                          <>{u.username} · <span className="text-[#FFD700]">{u.current_game.title}</span></>
                        ) : (
                          u.username
                        )}
                      </p>
                    </div>
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
