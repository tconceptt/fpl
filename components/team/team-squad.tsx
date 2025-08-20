"use client";

import { PlayerTile } from "@/components/team/player-tile";
import { TeamViewPlayer } from "@/services/team-service";

interface TeamSquadProps {
  starters: TeamViewPlayer[];
  bench: TeamViewPlayer[];
}

export function TeamSquad({ starters, bench }: TeamSquadProps) {
  const gk = starters.filter(p => p.positionType === "GKP");
  const def = starters.filter(p => p.positionType === "DEF");
  const mid = starters.filter(p => p.positionType === "MID");
  const fwd = starters.filter(p => p.positionType === "FWD");

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[url('/Images/pitch-pattern.png')] bg-cover bg-center p-3 sm:p-6">
        <div className="grid gap-4">
          <div className="flex justify-center gap-3 sm:gap-4">
            {gk.map(p => (
              <PlayerTile key={p.elementId} name={p.name} teamShortName={p.teamShortName} teamId={p.teamId} points={p.effectivePoints} role={p.positionType} isCaptain={p.isCaptain} isViceCaptain={p.isViceCaptain} />
            ))}
          </div>
          <div className="flex justify-center gap-3 sm:gap-4">
            {def.map(p => (
              <PlayerTile key={p.elementId} name={p.name} teamShortName={p.teamShortName} teamId={p.teamId} points={p.effectivePoints} role={p.positionType} isCaptain={p.isCaptain} isViceCaptain={p.isViceCaptain} />
            ))}
          </div>
          <div className="flex justify-center gap-3 sm:gap-4">
            {mid.map(p => (
              <PlayerTile key={p.elementId} name={p.name} teamShortName={p.teamShortName} teamId={p.teamId} points={p.effectivePoints} role={p.positionType} isCaptain={p.isCaptain} isViceCaptain={p.isViceCaptain} />
            ))}
          </div>
          <div className="flex justify-center gap-3 sm:gap-4">
            {fwd.map(p => (
              <PlayerTile key={p.elementId} name={p.name} teamShortName={p.teamShortName} teamId={p.teamId} points={p.effectivePoints} role={p.positionType} isCaptain={p.isCaptain} isViceCaptain={p.isViceCaptain} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm text-white/70 mb-2">Bench</div>
        <div className="flex flex-wrap gap-3">
          {bench.map(p => (
            <PlayerTile key={p.elementId} name={p.name} teamShortName={p.teamShortName} teamId={p.teamId} points={p.effectivePoints} role={p.positionType} isCaptain={p.isCaptain} isViceCaptain={p.isViceCaptain} />
          ))}
        </div>
      </div>
    </div>
  );
}


