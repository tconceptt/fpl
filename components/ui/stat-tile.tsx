import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export type Tone = "default" | "accent" | "positive" | "negative" | "info"

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-fg",
  accent: "text-accent",
  positive: "text-positive",
  negative: "text-negative",
  info: "text-info",
}

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
  href,
  icon: Icon,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: Tone
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-fg-2">{label}</span>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-fg-3" />}
        {href && !Icon && <ChevronRight className="h-4 w-4 shrink-0 text-fg-3" />}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums sm:text-3xl",
          TONE_CLASSES[tone]
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-fg-3">{sub}</div>}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:p-5",
          className
        )}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 sm:p-5",
        className
      )}
    >
      {content}
    </div>
  )
}
