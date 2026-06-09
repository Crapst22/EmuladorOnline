'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Calendar, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { UserProfile } from '@/types'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setUsername(data.username)
      }
    }
    load()
  }, [supabase])

  const handleUpdate = async () => {
    if (!profile) return
    setLoading(true)
    const { error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', profile.id)
    if (error) {
      toast({ variant: 'error', title: 'ERROR', description: error.message })
    } else {
      toast({ variant: 'success', title: 'PERFIL ACTUALIZADO' })
      setProfile({ ...profile, username })
    }
    setLoading(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    const filePath = `${profile.id}/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)
    if (uploadError) {
      toast({ variant: 'error', title: 'ERROR', description: 'No se pudo subir el avatar' })
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: publicUrl })
    toast({ variant: 'success', title: 'AVATAR ACTUALIZADO' })
  }

  return (
    <div className="space-y-6 py-6">
      <div className="retro-panel p-5">
        <h1 className="font-pixel text-[0.8rem] text-[#FFD700] tracking-wider retro-glow">PERFIL</h1>
        <p className="font-retro text-base text-[#A0A0A0] mt-1">Gestiona tu informacion personal</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>INFORMACION PERSONAL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 rounded-none">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="rounded-none text-[0.7rem]">
                  {profile?.username?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-[#050510]/80 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity border border-[#FFD700]/30">
                <Camera className="h-6 w-6 text-[#FFD700]" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <p className="font-pixel text-[0.6rem] text-[#FFD700]">{profile?.username}</p>
              <div className="flex items-center gap-1 font-retro text-sm text-[#808080] mt-1">
                <Calendar className="h-3 w-3" />
                Miembro desde {profile?.created_at ? formatDate(profile.created_at) : '-'}
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>EMAIL</Label>
              <div className="flex items-center gap-2 border border-[#FFD700]/20 bg-[#050510]/50 px-3 py-2">
                <Mail className="h-4 w-4 text-[#FFD700]/40" />
                <span className="font-retro text-base text-[#A0A0A0]">{email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">NOMBRE DE USUARIO</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]/40" />
                <Input
                  id="username"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
