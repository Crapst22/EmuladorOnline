'use client'

import { useState } from 'react'
import { Shield, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast({ variant: 'error', title: 'Error', description: error.message })
    } else {
      toast({ variant: 'success', title: 'Contraseña actualizada' })
      setNewPassword('')
    }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '¿Estás seguro? Esta acción eliminará todos tus datos y no se puede deshacer.'
    )
    if (!confirmed) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('play_sessions').delete().eq('user_id', user.id)
    await supabase.from('saves').delete().eq('user_id', user.id)
    await supabase.from('games').delete().eq('owner_id', user.id)
    await supabase.from('users').delete().eq('id', user.id)

    await supabase.storage.from('roms').remove([`${user.id}/`])
    await supabase.storage.from('saves').remove([`${user.id}/`])
    await supabase.storage.from('avatars').remove([`${user.id}/`])

    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuración</h1>
        <p className="text-zinc-400 mt-1">Administra tu cuenta y preferencias</p>
      </div>

      <Card className="border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <CardTitle>Cambiar contraseña</CardTitle>
          </div>
          <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading || !newPassword}>
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <CardTitle className="text-red-400">Zona de peligro</CardTitle>
          </div>
          <CardDescription>Eliminar tu cuenta es irreversible</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar mi cuenta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
