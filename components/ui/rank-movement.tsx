import React from "react";
import { cn } from "@/lib/utils";
import { getRankMovement } from "@/lib/ui-utils";
import { ChevronUp, ChevronDown } from "lucide-react";

interface RankMovementProps {
  currentRank: number;
  lastRank: number;
  className?: string;
  showDiff?: boolean;
  compact?: boolean;
}

export function RankMovement({ currentRank, lastRank, className, showDiff = true, compact = false }: RankMovementProps) {
  const movement = getRankMovement(currentRank, lastRank);
  const MovementIcon = movement.icon;
  
  if (movement.diff === 0) {
    return null;
  }
  
  // Compact mode: small chevron, with the size of the move alongside it
  // (e.g. ▲2) unless the caller opts out with showDiff={false}.
  if (compact) {
    const isUp = currentRank < lastRank;
    const color = isUp ? "text-green-400" : "text-red-400";
    const Icon = isUp ? ChevronUp : ChevronDown;
    return (
      <span className={cn("inline-flex items-center gap-0.5", className)}>
        <Icon className={cn("h-3 w-3", color)} />
        {showDiff && <span className={cn("text-xs font-semibold leading-none", color)}>{movement.diff}</span>}
      </span>
    );
  }
  
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {showDiff && <span className={movement.color}>{movement.diff}</span>}
      <MovementIcon className={cn("h-4 w-4", movement.color)} />
    </div>
  );
}
