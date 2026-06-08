'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signUp(email: string, password: string, username: string) {
  const supabase = await createServerSupabaseClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Error al crear usuario' }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    username,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Error al crear perfil' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) return { error: error.message }

  revalidatePath('/auth/login')
  return { success: true }
}

export async function resetPassword(email: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect_to=/profile`,
  })

  if (error) return { error: error.message }

  return { success: true }
}

export async function updatePassword(password: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  return { success: true }
}

export async function updateProfile(username: string, avatarUrl?: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const updates: Record<string, string> = { username }
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error } = await supabase.from('users').update(updates).eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile,
  }
}
