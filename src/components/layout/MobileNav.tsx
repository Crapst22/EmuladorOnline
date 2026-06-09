'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Gamepad2, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/juegos', icon: Gamepad2, label: 'Juegos' },
  { href: '/profile', icon: User, label: 'Perfil' },
  { href: '/settings', icon: Settings, label: 'Ajustes' },
]

export function MobileNav() {
  const pathname = usePathname()

  if (pathname.startsWith('/play/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[#FFD700]/20 bg-[#050510]/95 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 font-pixel text-[0.45rem] tracking-wider transition-colors',
                isActive ? 'text-[#FFD700]' : 'text-[#808080] hover:text-[#FFD700]/60'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-[#FFD700]')} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
