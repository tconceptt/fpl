"use client"

import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function NavigationTabs() {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    {
      name: "League",
      href: "/",
      active: pathname === "/"
    },
    {
      name: "Gameweek",
      href: "/gameweek",
      active: pathname === "/gameweek"
    },
    {
      name: "Stats",
      href: "/stats",
      active: pathname === "/stats"
    },
    {
      name: "Head to Head",
      href: "/h2h",
      active: pathname === "/h2h"
    }
  ]

  return (
    <div className="flex space-x-1 rounded-lg bg-white/5 p-1 border border-white/10">
      {tabs.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
        return (
          <button
            key={tab.name}
            onClick={() => router.push(tab.href)}
            className={cn(
              "flex-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-all",
              isActive
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            {tab.name}
          </button>
        )
      })}
    </div>
  )
} 