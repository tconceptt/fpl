"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GameweekSelectorProps {
  currentGameweek: number
  selectedGameweek?: number
  className?: string
  /**
   * When provided, gameweek changes call this instead of navigating —
   * used by the league table's client-side gameweek switching (useLeague)
   * so picking a gameweek never triggers a server round trip.
   */
  onChange?: (gw: number) => void
}

export function GameweekSelector({
  currentGameweek,
  selectedGameweek,
  className,
  onChange,
}: GameweekSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameweeks = Array.from({ length: currentGameweek }, (_, i) => i + 1)

  // Default to current gameweek if selectedGameweek is undefined
  const selected = selectedGameweek || currentGameweek
  const currentValue = selected.toString()

  const handleGameweekChange = (value: string) => {
    if (onChange) {
      onChange(parseInt(value, 10))
      return
    }
    const params = new URLSearchParams(searchParams)
    params.set('gw', value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handlePrev = () => {
    if (selected > 1) {
      handleGameweekChange((selected - 1).toString())
    }
  }

  const handleNext = () => {
    if (selected < currentGameweek) {
      handleGameweekChange((selected + 1).toString())
    }
  }

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
        className
      )}
    >
      <button
        onClick={handlePrev}
        disabled={selected <= 1}
        aria-label="Previous gameweek"
        className={cn(
          "flex h-full min-h-9 min-w-9 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          selected <= 1
            ? "cursor-not-allowed text-fg-3 opacity-50"
            : "text-fg-2 hover:bg-surface-3 hover:text-fg"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Select value={currentValue} onValueChange={handleGameweekChange}>
        <SelectTrigger
          aria-label="Select gameweek"
          className="h-full w-auto min-w-[72px] border-0 bg-transparent px-2 py-0 text-xs font-semibold text-accent shadow-none focus:ring-0 focus-visible:ring-0"
        >
          <SelectValue placeholder="Select gameweek" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select Gameweek</SelectLabel>
            <div className="max-h-[300px] overflow-y-auto px-1">
              {gameweeks.map((gw) => (
                <SelectItem key={gw} value={gw.toString()}>
                  GW {gw}
                </SelectItem>
              ))}
            </div>
          </SelectGroup>
        </SelectContent>
      </Select>

      <button
        onClick={handleNext}
        disabled={selected >= currentGameweek}
        aria-label="Next gameweek"
        className={cn(
          "flex h-full min-h-9 min-w-9 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          selected >= currentGameweek
            ? "cursor-not-allowed text-fg-3 opacity-50"
            : "text-fg-2 hover:bg-surface-3 hover:text-fg"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
