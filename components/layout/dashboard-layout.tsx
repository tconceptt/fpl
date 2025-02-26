import { MainNav } from "@/components/layout/main-nav"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { UserNav } from "@/components/layout/user-nav"
import { ReactNode } from "react"

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <MainNav />
          <div className="flex flex-1 items-center justify-end space-x-4">
            <UserNav />
            <MobileMenu />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-4 sm:py-6 md:py-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-white/10 py-4 text-center text-white/60">
        <div className="container text-xs">
          <p>Qitawrari © {new Date().getFullYear()} - Built with Next.js and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  )
} 