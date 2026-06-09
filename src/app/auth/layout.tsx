import { Gamepad2 } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/dashboard" className="mb-8 flex items-center justify-center gap-3">
            <div className="retro-coin">
              <Gamepad2 className="h-4 w-4 text-[#050510]" />
            </div>
            <span className="font-pixel text-[0.9rem] text-[#FFD700] tracking-wider retro-glow">
              RetroCloud
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
