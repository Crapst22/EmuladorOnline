import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import PresencePing from '@/components/PresencePing'
import BittoChat from '@/components/chat/BittoChat'

export const metadata: Metadata = {
  title: 'RetroVerse',
  description: 'Plataforma web para jugar ROMs de Super Nintendo desde el navegador con sincronización en la nube.',
  icons: { icon: '/icon.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen font-retro text-zinc-100 antialiased">
        <div className="stars-layer-3" />
        <div className="nebula" />
        <div className="stars-layer-1" />
        <div className="stars-layer-2" />
        <div className="scanlines" />
        <div className="vignette" />
        {children}
        <Toaster />
        <BittoChat />
      </body>
    </html>
  )
}
