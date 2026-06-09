import { GameList } from '@/components/game/GameList'

export default function DashboardPage() {
  return (
    <div className="space-y-8 py-6">
      <div className="retro-panel p-5 retro-speed-lines">
        <div className="flex items-center gap-3 mb-1">
          <div className="retro-coin">
            <span className="text-[#050510] font-pixel text-[0.4rem]">B</span>
          </div>
          <h1 className="font-pixel text-[0.8rem] text-[#FFD700] tracking-wider retro-glow">
            MI BIBLIOTECA
          </h1>
        </div>
        <p className="font-retro text-base text-[#A0A0A0] ml-8">
          Tus ROMs y partidas guardadas
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'JUEGOS', value: '-', icon: '\u25B2' },
          { label: 'HORAS JUGADAS', value: '-', icon: '\u25B6' },
          { label: 'ULTIMA SESION', value: '-', icon: '\u2605' },
        ].map((stat) => (
          <div key={stat.label} className="retro-panel-dark p-4 relative">
            <div className="retro-corner-tl" />
            <div className="retro-corner-tr" />
            <div className="retro-corner-bl" />
            <div className="retro-corner-br" />
            <p className="font-pixel text-[0.5rem] text-[#808080] tracking-wider mb-1">{stat.icon} {stat.label}</p>
            <p className="font-pixel text-[1.2rem] text-[#FFD700]">{stat.value}</p>
          </div>
        ))}
      </div>
      <GameList />
    </div>
  )
}
