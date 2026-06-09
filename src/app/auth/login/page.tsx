'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="retro-triangles">
          <CardTitle className="text-[0.85rem]">INICIAR SESION</CardTitle>
        </div>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="border border-[#FF2400]/50 bg-[#FF2400]/10 p-3 font-retro text-base text-[#FF2400]">
              {error === 'Invalid login credentials' ? 'CREDENCIALES INVALIDAS' : error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">EMAIL</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]/40" />
              <Input id="email" type="email" placeholder="tu@email.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">CONTRASENA</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]/40" />
              <Input id="password" type="password" placeholder="********" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <div className="flex justify-end">
            <Link href="/auth/recover" className="retro-link font-retro text-sm">
              ¿Olvidaste tu contrasena?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center font-retro text-base text-[#808080]">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" className="retro-link">Registrate</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
