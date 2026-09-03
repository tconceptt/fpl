import * as React from "react"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

export function RankCell({
  rank,
  lastRank,
  label,
  total,
  className,
}: {
  rank: number
  lastRank?: number | null
  label?: string
  total?: number
  className?: string
}) {
  const isLeader = rank === 1
  const isLast = Boolean(total) && rank === total

  const diff =
    typeof lastRank === "number" && lastRank > 0 ? lastRank - rank : 0

  let Icon = Minus
  let moveColor = "text-fg-3"
  if (diff > 0) {
    Icon = ArrowUp
    moveColor = "text-positive"
  } else if (diff < 0) {
    Icon = ArrowDown
    moveColor = "text-negative"
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          isLeader ? "text-accent" : isLast ? "text-negative" : "text-fg"
        )}
      >
        {label ?? rank}
      </span>
      {typeof lastRank === "number" && lastRank > 0 && (
        <span className={cn("inline-flex items-center gap-0.5", moveColor)}>
          <Icon className="h-3 w-3" />
          {diff !== 0 && (
            <span className="text-[11px] font-medium tabular-nums leading-none">
              {Math.abs(diff)}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
