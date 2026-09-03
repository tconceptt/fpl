import { MainNav } from "@/components/layout/main-nav"
import { ReactNode } from "react"
import { BottomNav } from "@/components/layout/bottom-nav"

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 hidden border-b border-border bg-surface/95 md:block">
        <div className="container flex h-14 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-20">
        <div className="container px-4 py-4 sm:py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <BottomNav />
      <footer className="hidden border-t border-border py-4 text-center text-fg-3 md:block">
        <div className="container text-xs">
          <p>Qitawrari © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
