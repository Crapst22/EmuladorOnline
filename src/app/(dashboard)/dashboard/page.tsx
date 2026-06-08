import { GameList } from '@/components/game/GameList'

export default function DashboardPage() {
  return (
    <div className="space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Mi Biblioteca</h1>
        <p className="text-zinc-400 mt-1">Tus ROMs y partidas guardadas</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Juegos', value: '-' },
          { label: 'Horas jugadas', value: '-' },
          { label: 'Última sesión', value: '-' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <GameList />
    </div>
  )
}
