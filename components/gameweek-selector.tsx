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
}

export function GameweekSelector({
  currentGameweek,
  selectedGameweek,
  className
}: GameweekSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameweeks = Array.from({ length: currentGameweek }, (_, i) => i + 1)

  // Default to current gameweek if selectedGameweek is undefined
  const selected = selectedGameweek || currentGameweek
  const currentValue = selected.toString()

  const handleGameweekChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('gameweek', value)
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
    <div className={cn("flex items-center gap-0.5 bg-gray-800/50 border border-white/10 rounded-lg p-0.5", className)}>
      {/* Previous arrow button */}
      <button
        onClick={handlePrev}
        disabled={selected <= 1}
        className={cn(
          "p-1 rounded-md transition-all",
          selected <= 1
            ? "text-white/20 cursor-not-allowed"
            : "text-white/60 hover:text-white hover:bg-white/5"
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      
      {/* Separator */}
      <div className="w-px h-4 bg-white/10" />
      
      {/* Dropdown with subtle background */}
      <Select value={currentValue} onValueChange={handleGameweekChange}>
        <SelectTrigger className="h-auto border-0 bg-purple-900/20 hover:bg-purple-900/30 shadow-none focus:ring-0 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold min-w-[55px] sm:min-w-[70px] rounded-md transition-colors">
          <SelectValue placeholder="Select gameweek" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border border-purple-500/30 rounded-lg shadow-2xl">
          <SelectGroup>
            <SelectLabel className="text-xs text-white/60 font-semibold px-3 py-2">Select Gameweek</SelectLabel>
            <div className="max-h-[300px] overflow-y-auto px-1">
              {gameweeks.map((gw) => (
                <SelectItem 
                  key={gw} 
                  value={gw.toString()} 
                  className="cursor-pointer rounded-md my-0.5 text-sm hover:bg-purple-900/30 focus:bg-purple-900/40 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                >
                  GW {gw}
                </SelectItem>
              ))}
            </div>
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {/* Separator */}
      <div className="w-px h-4 bg-white/10" />
      
      {/* Next arrow button */}
      <button
        onClick={handleNext}
        disabled={selected >= currentGameweek}
        className={cn(
          "p-1 rounded-md transition-all",
          selected >= currentGameweek
            ? "text-white/20 cursor-not-allowed"
            : "text-white/60 hover:text-white hover:bg-white/5"
        )}
      >
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  )
} 