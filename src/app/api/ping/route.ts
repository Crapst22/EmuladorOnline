import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
