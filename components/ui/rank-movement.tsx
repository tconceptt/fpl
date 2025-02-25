import React from "react";
import { cn } from "@/lib/utils";
import { getRankMovement } from "@/lib/ui-utils";

interface RankMovementProps {
  currentRank: number;
  lastRank: number;
  className?: string;
}

export function RankMovement({ currentRank, lastRank, className }: RankMovementProps) {
  const movement = getRankMovement(currentRank, lastRank);
  const MovementIcon = movement.icon;
  
  if (movement.diff === 0) {
    return null;
  }
  
  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <span className={movement.color}>{movement.diff}</span>
      <MovementIcon className={cn("h-4 w-4", movement.color)} />
    </div>
  );
} 