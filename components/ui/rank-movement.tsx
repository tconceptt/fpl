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
  
  // Compact mode: small chevron arrows
  if (compact) {
    const isUp = currentRank < lastRank;
    return isUp ? (
      <ChevronUp className={cn("h-3 w-3 text-green-400", className)} />
    ) : (
      <ChevronDown className={cn("h-3 w-3 text-red-400", className)} />
    );
  }
  
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {showDiff && <span className={movement.color}>{movement.diff}</span>}
      <MovementIcon className={cn("h-4 w-4", movement.color)} />
    </div>
  );
} 