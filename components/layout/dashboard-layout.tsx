import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="mx-auto max-w-7xl">
        <div className={cn("p-6 lg:p-8", className)}>
          {children}
        </div>
      </div>
    </div>
  )
} 