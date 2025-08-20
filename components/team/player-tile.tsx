"use client";

import { Jersey } from "@/components/team/jersey";
import { cn } from "@/lib/utils";

interface PlayerTileProps {
  name: string;
  teamShortName: string;
  teamId?: number | null;
  points: number;
  role: "GKP" | "DEF" | "MID" | "FWD";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export function PlayerTile({ name, teamShortName, teamId, points, role, isCaptain, isViceCaptain }: PlayerTileProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2 text-center min-w-[92px]")}> 
      <Jersey teamId={teamId} size="md" />
      <div className="text-xs text-white/60">{teamShortName} • {role}</div>
      <div className="max-w-[110px] truncate text-sm font-medium" title={name}>
        {name}
        {isCaptain && <span className="ml-1 text-yellow-400">(C)</span>}
        {!isCaptain && isViceCaptain && <span className="ml-1 text-indigo-300">(VC)</span>}
      </div>
      <div className="text-xs text-white/70">{points} pts</div>
    </div>
  );
}


