import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { RankMovement } from "@/types/league";

export function getRankMovement(currentRank: number, lastRank: number): RankMovement {
  if (currentRank < lastRank) {
    return { 
      icon: ArrowUp, 
      color: "text-emerald-500", 
      diff: lastRank - currentRank 
    };
  } else if (currentRank > lastRank) {
    return { 
      icon: ArrowDown, 
      color: "text-red-500", 
      diff: currentRank - lastRank 
    };
  }
  return { 
    icon: Minus, 
    color: "text-white/60", 
    diff: 0 
  };
} 