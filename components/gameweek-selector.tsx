"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const currentValue = (selectedGameweek || currentGameweek).toString()

  const handleGameweekChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('gameweek', value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Select
      value={currentValue}
      onValueChange={handleGameweekChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select gameweek" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        <SelectGroup>
          <SelectLabel>Gameweeks</SelectLabel>
          {gameweeks.map((gw) => (
            <SelectItem
              key={gw}
              value={gw.toString()}
              className="cursor-pointer"
            >
              Gameweek {gw}
              {gw === currentGameweek && " (Current)"}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
} 