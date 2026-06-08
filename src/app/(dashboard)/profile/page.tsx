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
      toast({ variant: 'error', title: 'Error', description: error.message })
    } else {
      toast({ variant: 'success', title: 'Perfil actualizado' })
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
      toast({ variant: 'error', title: 'Error', description: 'No se pudo subir el avatar' })
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: publicUrl })
    toast({ variant: 'success', title: 'Avatar actualizado' })
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Perfil</h1>
        <p className="text-zinc-400 mt-1">Gestiona tu información personal</p>
      </div>

      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 ring-2 ring-purple-500/30">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-600 text-xl">
                  {profile?.username?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <p className="text-lg font-medium text-white">{profile?.username}</p>
              <div className="flex items-center gap-1 text-sm text-zinc-500">
                <Calendar className="h-3 w-3" />
                Miembro desde {profile?.created_at ? formatDate(profile.created_at) : '-'}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <Mail className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">{email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="username"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
