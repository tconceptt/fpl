import * as React from "react"

import { cn } from "@/lib/utils"
import { ChipBadge } from "@/components/ui/chip-badge"

export function ManagerIdentity({
  entryName,
  playerName,
  rank,
  captain,
  chip,
  size = "md",
  className,
}: {
  entryName: string
  playerName?: string | null
  rank?: number | null
  captain?: string | null
  chip?: string | null
  size?: "sm" | "md"
  className?: string
}) {
  const showThirdLine = Boolean(captain || chip)

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "truncate font-semibold text-fg",
            size === "sm" ? "text-sm" : "text-sm sm:text-base"
          )}
        >
          {entryName}
        </span>
        {typeof rank === "number" && (
          <span className="shrink-0 text-xs text-fg-3">#{rank}</span>
        )}
      </div>
      {playerName && (
        <div className="truncate text-xs text-fg-2">{playerName}</div>
      )}
      {showThirdLine && (
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-3">
          {captain && <span className="truncate">C: {captain}</span>}
          {chip && <ChipBadge chip={chip} />}
        </div>
      )}
    </div>
  )
}
