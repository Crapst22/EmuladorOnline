import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmulatorWrapper } from '@/components/emulator/EmulatorWrapper'
import { STORAGE_BUCKETS } from '@/lib/constants'

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single()
  if (!game) redirect('/dashboard')

  if (game.archived && game.owner_id === user.id) {
    const serviceRole = createServiceRoleClient()
    if (serviceRole) {
      await serviceRole.from('games').update({ archived: false }).eq('id', game.id)
      game.archived = false
    }
  }

  const { data: urlData } = await supabase.storage
    .from(STORAGE_BUCKETS.ROMS)
    .createSignedUrl(game.rom_path, 3600)

  if (!urlData?.signedUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="retro-panel p-8">
          <p className="font-pixel text-[0.7rem] text-[#FF2400]">ERROR AL CARGAR LA ROM</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32 md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <EmulatorWrapper game={game} romUrl={urlData.signedUrl} />
      </div>
    </div>
  )
}
