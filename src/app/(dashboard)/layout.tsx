import { Navbar } from '@/components/layout/Navbar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
