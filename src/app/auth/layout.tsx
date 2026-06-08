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
          <Link href="/dashboard" className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold">
            <Gamepad2 className="h-8 w-8 text-purple-500" />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              RetroCloud
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
