import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'RetroCloud - Tus clásicos en cualquier lugar',
  description: 'Plataforma web para jugar ROMs de Super Nintendo desde el navegador con sincronización en la nube.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
