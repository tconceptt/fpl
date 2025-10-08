"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buildKitFilenames, normalizeTeamBasename } from "@/lib/kits-map";
import { TEAM_IDS } from "@/lib/team-ids";

type Player = {
  id: number;
  name: string;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number;
  total: number;
  metrics: Record<string, number>;
  rawTotal: number;
  rawMetrics: Record<string, number>;
  elementType?: number;
  clubName?: string;
  teamId?: number;
};

function kitCandidatePaths(p: Pick<Player, "elementType" | "clubName" | "id" | "teamId">): string[] {
  const base = "/Images/kits";
  let basename = "";
  if (typeof p.teamId === "number") {
    const found = TEAM_IDS.find((t) => t.id === p.teamId);
    basename = found?.kitBasename || normalizeTeamBasename(String(p.teamId));
  } else {
    basename = normalizeTeamBasename(p.clubName || "");
  }
  const files = buildKitFilenames(basename, (p.elementType || 0) === 1);
  return files.map((f) => `${base}/${f}`);
}

function KitImage({ player, className }: { player: Pick<Player, "elementType" | "clubName" | "id" | "teamId">; className?: string }) {
  const paths = kitCandidatePaths(player);
  const [idx, setIdx] = useState(0);
  const src = paths[Math.min(idx, paths.length - 1)];
  return (
    <Image
      src={src}
      alt="kit"
      width={16}
      height={16}
      className={className}
      sizes="(max-width: 640px) 16px, 16px"
      onError={() => setIdx((i) => Math.min(i + 1, paths.length - 1))}
    />
  );
}


const metricsLabel: Record<string, string> = {
  minutes: "Minutes",
  clean_sheet: "Clean sheet",
  goals_scored: "Goals scored",
  assists: "Assists",
  bonus: "Bonus",
  saves: "Saves",
  penalties_saved: "Penalties saved",
  penalties_missed: "Penalties missed",
  yellow_cards: "Yellow cards",
  red_cards: "Red cards",
  own_goals: "Own goals",
  goals_conceded: "Goals conceded",
  defensive_contribution: "Defensive contribution",
};

export function TeamBreakdownClient({ players }: { players: Player[] }) {
  const starters = useMemo(() => (players || []).filter((p) => p.position <= 11), [players]);
  const bench = useMemo(() => (players || []).filter((p) => p.position > 11), [players]);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  return (
    <div className="text-sm border border-white/10 rounded-lg overflow-hidden shadow-lg">
      <div className="flex font-bold text-gray-300 px-3 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="w-7" />
        <div className="flex-1">Player</div>
        <div className="w-12 text-center">Mins</div>
        <div className="w-10 text-right">Pts</div>
      </div>
      {starters.map((p, index) => {
        const minutesPts = p.rawMetrics?.minutes ?? undefined;
        const minutes = minutesPts >= 2 ? "90" : minutesPts === 1 ? "45" : "0";
        return (
          <button
            key={p.id}
            onClick={() => setSelectedPlayer(p)}
            className={cn(
              "w-full flex items-center px-3 py-1.5 text-left border-b border-white/5",
              index % 2 === 0 ? "bg-gray-800/50" : "bg-gray-900/50",
              "hover:bg-purple-900/20 transition-all cursor-pointer active:scale-[0.99]"
            )}
          >
            <div className="w-7 flex items-center justify-center">
              <KitImage player={p} className="h-5 w-5 object-contain" />
            </div>
            <div className="flex-1 min-w-0 ml-2">
              <div className="font-semibold truncate text-white text-[13px]">
                {p.name}
                {p.isCaptain && <span className="ml-1 text-[11px] text-purple-400 font-bold">C×{p.multiplier}</span>}
                {!p.isCaptain && p.multiplier > 1 && <span className="ml-1 text-[11px] text-purple-400 font-bold">×{p.multiplier}</span>}
              </div>
            </div>
            <div className={cn(
              "w-12 text-center text-[11px] font-medium",
              minutes === "90" ? "text-green-400" : minutes === "45" ? "text-yellow-400" : "text-red-400"
            )}>
              {minutes}&apos;
            </div>
            <div className="w-10 text-right font-bold text-sm text-white">{p.total || 0}</div>
          </button>
        );
      })}

      {bench.length > 0 && (
        <div className="bg-black/30">
          <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-white/60 font-bold border-t-2 border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
            Bench
          </div>
          {bench.map((p, index) => {
            const minutesPts = p.rawMetrics?.minutes ?? undefined;
            const minutes = minutesPts >= 2 ? "90" : minutesPts === 1 ? "45" : "0";
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center px-3 py-1.5 border-b border-white/5",
                  index % 2 === 0 ? "bg-gray-800/30" : "bg-gray-900/30"
                )}
              >
                <div className="w-7 flex items-center justify-center">
                  <KitImage player={p} className="h-5 w-5 object-contain opacity-70" />
                </div>
                <div className="flex-1 min-w-0 ml-2">
                  <div className="truncate text-white/80 text-[13px]">{p.name}</div>
                </div>
                <div className={cn(
                  "w-12 text-center text-[11px] font-medium",
                  minutes === "90" ? "text-green-400/70" : minutes === "45" ? "text-yellow-400/70" : "text-red-400/70"
                )}>
                  {minutes}&apos;
                </div>
                <div className="w-10 text-right font-semibold text-white/70 text-[13px]">{p.rawTotal || 0}</div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlayer && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedPlayer(null)} />
          <div className="relative z-10 w-full sm:max-w-md sm:mx-4 rounded-t-md sm:rounded-md border border-white/10 bg-neutral-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <KitImage player={selectedPlayer} className="h-5 w-5 object-contain" />
                <div className="font-semibold">{selectedPlayer.name}</div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-4 text-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/60">Points</div>
                <div className="text-lg font-bold">{(selectedPlayer.total || 0).toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(selectedPlayer.metrics)
                  .filter(([, v]) => v !== 0)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <div className="text-white/70">{metricsLabel[k] ?? k}</div>
                      <div className={v < 0 ? "text-red-300" : "text-green-300"}>{v > 0 ? `+${v}` : v}</div>
                    </div>
                  ))}
                {Object.keys(selectedPlayer.metrics).filter((k) => selectedPlayer.metrics[k] !== 0).length === 0 && (
                  <div className="text-white/60">No returns</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
