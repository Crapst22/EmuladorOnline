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
            <img src="/logo.png" alt="RetroVerse" className="h-14 w-auto" />
            <span className="font-pixel text-[0.9rem] text-[#FFD700] tracking-wider retro-glow">
              RetroVerse
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
