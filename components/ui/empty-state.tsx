import * as React from "react"
import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <Icon className="h-8 w-8 text-fg-3" />
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-fg-2">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
