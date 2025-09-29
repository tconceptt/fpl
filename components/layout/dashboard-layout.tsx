import { ReactNode } from "react"
import { BottomNav } from "@/components/layout/bottom-nav"

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-20">
        <div className="container py-4 sm:py-6 md:py-8">{children}</div>
      </main>
      <BottomNav />
      <footer className="hidden md:block border-t border-white/10 py-4 text-center text-white/60">
        <div className="container text-xs">
          <p>Qitawrari © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
} 