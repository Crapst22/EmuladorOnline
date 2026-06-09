'use client'

import { AllGamesList } from '@/components/game/AllGamesList'

export default function JuegosPage() {
  return (
    <div className="space-y-8 py-6">
      <div className="retro-panel p-5 retro-speed-lines">
        <div className="flex items-center gap-3 mb-1">
          <img src="/favicon-symbol.png" alt="" className="h-8 w-8" />
          <h1 className="font-pixel text-[0.8rem] text-[#FFD700] tracking-wider retro-glow">
            TODOS LOS JUEGOS
          </h1>
        </div>
        <p className="font-retro text-base text-[#A0A0A0] ml-8">
          Biblioteca completa de ROMs cargadas por la comunidad
        </p>
      </div>
      <AllGamesList />
    </div>
  )
}
