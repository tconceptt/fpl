import * as React from "react"

import { cn } from "@/lib/utils"

export function LivePill({
  label = "Live",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-positive/30 bg-positive-soft px-2 py-0.5 text-xs font-medium text-positive",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-positive" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
      </span>
      {label}
    </span>
  )
}
