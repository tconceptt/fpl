"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildKitFilenames, normalizeTeamBasename } from "@/lib/kits-map";
import { TEAM_IDS } from "@/lib/team-ids";
import { ChevronUp, ChevronDown } from "lucide-react";

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
  actualMinutes?: number;
  autoSubIn?: boolean;
  autoSubOut?: boolean;
  opponentShortName?: string;
  fixtureStarted?: boolean;
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
  clean_sheets: "Clean sheet",
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
  points_modification: "Points adjustment",
};

export function BreakdownTable({ players, compact = false, activeChip }: { players: Player[]; compact?: boolean; activeChip?: string | null }) {
  const starters = players.filter((p) => p.position <= 11);
  const bench = players.filter((p) => p.position > 11);
  const isBenchBoostActive = activeChip === 'bboost';

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [startingTeams, setStartingTeams] = useState<Array<{ teamId: number; teamName: string; managerName: string; netPoints: number }> | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const searchParams = useSearchParams();
  const gw = searchParams.get("gw");

  useEffect(() => {
    if (selectedPlayer && gw) {
      setIsLoadingTeams(true);
      setStartingTeams(null);
      fetch(`/api/league/player-ownership?playerId=${selectedPlayer.id}&gw=${gw}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.teams) {
            setStartingTeams(data.teams);
          }
        })
        .catch((err) => console.error("Failed to fetch starting teams:", err))
        .finally(() => setIsLoadingTeams(false));
    } else {
      setStartingTeams(null);
    }
  }, [selectedPlayer, gw]);

  const selectedPlayerIsTripleCaptain = selectedPlayer ? (selectedPlayer.isCaptain && activeChip === "3xc") : false;

  return (
    <>
      <div className="text-sm border border-white/10 rounded-lg overflow-hidden shadow-lg">
        <div className="flex font-bold text-gray-300 px-3 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="w-7" />
          <div className="flex-1">Player</div>
          {!compact && <div className="w-12 text-center">Mins</div>}
          <div className="w-10 text-right">Pts</div>
        </div>
        {starters.map((p, index) => {
          const minutes = p.actualMinutes ?? 0;
          const isTripleCaptain = p.isCaptain && activeChip === "3xc";
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayer(p)}
              className={cn(
                "w-full flex items-center px-3 py-1.5 text-left border-b transition-all cursor-pointer active:scale-[0.99]",
                isTripleCaptain
                  ? "bg-gradient-to-r from-purple-900/40 to-purple-800/30 border-purple-500/30 hover:from-purple-900/50 hover:to-purple-800/40"
                  : cn(
                    index % 2 === 0 ? "bg-gray-800/50" : "bg-gray-900/50",
                    "border-white/5 hover:bg-purple-900/20"
                  )
              )}
            >
              <div className="w-7 flex items-center justify-center">
                <KitImage player={p} className={cn("h-5 w-5 object-contain", isTripleCaptain && "ring-2 ring-purple-400/50 rounded")} />
              </div>
              <div className="flex-1 min-w-0 ml-2">
                <div className="font-semibold truncate text-white text-[13px] flex items-center gap-1">
                  <span className={cn("truncate", isTripleCaptain && "text-purple-200")}>{p.name}</span>
                  {p.isCaptain && (
                    <div className="flex items-center gap-1">
                      <Image
                        src="/Images/captain-band.png"
                        alt="Captain"
                        width={14}
                        height={14}
                        className="object-contain"
                      />
                      {isTripleCaptain && (
                        <span className="text-[10px] text-purple-300 font-bold bg-purple-500/30 px-1.5 py-0.5 rounded border border-purple-400/50">
                          3×
                        </span>
                      )}
                    </div>
                  )}
                  {!p.isCaptain && p.multiplier > 1 && <span className="text-[11px] text-purple-400 font-bold">×{p.multiplier}</span>}
                  {p.autoSubIn && <ChevronUp className="h-3 w-3 text-green-400" />}
                </div>
              </div>
              {!compact && (
                <div className={cn(
                  "w-12 text-center text-[11px] font-medium",
                  minutes >= 60 ? "text-green-400" : minutes > 0 ? "text-yellow-400" : "text-red-400"
                )}>
                  {p.fixtureStarted === false && p.opponentShortName ? (
                    <span className="text-gray-400">v {p.opponentShortName}</span>
                  ) : (
                    <>{minutes}&apos;</>
                  )}
                </div>
              )}
              <div className={cn("w-10 text-right font-bold text-sm", isTripleCaptain ? "text-purple-200" : "text-white")}>{p.total || 0}</div>
            </button>
          );
        })}

        {bench.length > 0 && (
          <div className={isBenchBoostActive ? "bg-gradient-to-b from-cyan-900/20 to-black/30" : "bg-black/30"}>
            <div className={cn(
              "px-3 py-1 text-[11px] uppercase tracking-wider font-bold border-t-2 bg-gradient-to-r",
              isBenchBoostActive
                ? "text-cyan-300 border-cyan-500/50 from-cyan-900/40 to-cyan-800/30"
                : "text-white/60 border-gray-700 from-gray-800 to-gray-900"
            )}>
              <div className="flex items-center gap-2">
                Bench
                {isBenchBoostActive && (
                  <span className="text-[9px] text-cyan-200 font-bold bg-cyan-500/40 px-1.5 py-0.5 rounded border border-cyan-400/50">
                    ACTIVE
                  </span>
                )}
              </div>
            </div>
            {bench.map((p, index) => {
              const minutes = p.actualMinutes ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => isBenchBoostActive && setSelectedPlayer(p)}
                  className={cn(
                    "w-full flex items-center px-3 py-1.5 border-b transition-all",
                    isBenchBoostActive
                      ? cn(
                        "cursor-pointer active:scale-[0.99]",
                        index % 2 === 0
                          ? "bg-cyan-900/20 hover:bg-cyan-800/30"
                          : "bg-cyan-950/20 hover:bg-cyan-800/30",
                        "border-cyan-500/10"
                      )
                      : cn(
                        index % 2 === 0 ? "bg-gray-800/30" : "bg-gray-900/30",
                        "border-white/5 cursor-default"
                      )
                  )}
                >
                  <div className="w-7 flex items-center justify-center">
                    <KitImage player={p} className={cn("h-5 w-5 object-contain", !isBenchBoostActive && "opacity-70")} />
                  </div>
                  <div className="flex-1 min-w-0 ml-2">
                    <div className={cn(
                      "flex items-center gap-1 truncate text-[13px]",
                      isBenchBoostActive ? "text-white" : "text-white/80"
                    )}>
                      <span className="truncate">{p.name}</span>
                      {p.autoSubOut && <ChevronDown className="h-3 w-3 text-red-400" />}
                    </div>
                  </div>
                  {!compact && (
                    <div className={cn(
                      "w-12 text-center text-[11px] font-medium",
                      isBenchBoostActive
                        ? (minutes >= 60 ? "text-green-400" : minutes > 0 ? "text-yellow-400" : "text-red-400")
                        : (minutes >= 60 ? "text-green-400/70" : minutes > 0 ? "text-yellow-400/70" : "text-red-400/70")
                    )}>
                      {p.fixtureStarted === false && p.opponentShortName ? (
                        <span className={isBenchBoostActive ? "text-gray-400" : "text-gray-400/70"}>v {p.opponentShortName}</span>
                      ) : (
                        <>{minutes}&apos;</>
                      )}
                    </div>
                  )}
                  <div className={cn(
                    "w-10 text-right font-semibold text-[13px]",
                    isBenchBoostActive ? "font-bold text-white" : "text-white/70"
                  )}>
                    {isBenchBoostActive ? (p.total || 0) : (p.rawTotal || 0)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)} />
          <div className={cn(
            "relative z-10 w-full max-w-sm rounded-lg border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
            selectedPlayerIsTripleCaptain
              ? "bg-gradient-to-b from-purple-900/40 to-gray-900 border-purple-500/30"
              : "bg-gray-900 border-white/10"
          )}>
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-4 py-3 border-b shrink-0",
              selectedPlayerIsTripleCaptain
                ? "border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-purple-800/40"
                : "border-white/10 bg-gradient-to-r from-purple-900/30 to-blue-900/30"
            )}>
              <div className="flex items-center gap-2.5">
                <KitImage player={selectedPlayer} className={cn("h-6 w-6 object-contain", selectedPlayerIsTripleCaptain && "ring-2 ring-purple-400/50 rounded")} />
                <div className="flex items-center gap-2">
                  <div className={cn("font-semibold text-sm", selectedPlayerIsTripleCaptain ? "text-purple-200" : "text-white")}>{selectedPlayer.name}</div>
                  {selectedPlayerIsTripleCaptain && (
                    <span className="text-[10px] text-purple-200 font-bold bg-purple-500/40 px-2 py-0.5 rounded border border-purple-400/50">
                      TRIPLE CAPTAIN
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-white/60 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto">
              {/* Points Table */}
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-xs font-semibold text-white/60 uppercase tracking-wide">Stat</th>
                      <th className="text-right py-2 text-xs font-semibold text-white/60 uppercase tracking-wide">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedPlayer.isCaptain ? selectedPlayer.rawMetrics : selectedPlayer.metrics)
                      .filter(([, v]) => v !== 0)
                      .map(([k, v]) => (
                        <tr key={k} className="border-b border-white/5">
                          <td className="py-2.5 text-white/80">{metricsLabel[k] ?? k}</td>
                          <td className="py-2.5 text-right font-medium text-white">
                            {v < 0 ? v : v}
                          </td>
                        </tr>
                      ))}
                    <tr className={cn("border-t-2", selectedPlayerIsTripleCaptain ? "border-purple-500/30" : "border-white/20")}>
                      <td className={cn("py-2.5 font-semibold", selectedPlayerIsTripleCaptain ? "text-purple-200" : "text-white")}>Total</td>
                      <td className={cn("py-2.5 text-right font-bold text-base", selectedPlayerIsTripleCaptain ? "text-purple-200" : "text-white")}>
                        {selectedPlayer.isCaptain ? (selectedPlayer.rawTotal || 0) : (selectedPlayer.total || 0)}
                        {selectedPlayerIsTripleCaptain && (
                          <span className="ml-2 text-xs text-purple-300/80">
                            (×3 = {(selectedPlayer.rawTotal || 0) * 3})
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {Object.keys(selectedPlayer.metrics).filter((k) => selectedPlayer.metrics[k] !== 0).length === 0 && (
                  <div className="text-center py-6 text-white/50 text-sm">
                    No points scored this gameweek
                  </div>
                )}
              </div>

              {/* Teams Starting This Player */}
              <div className="border-t border-white/10 p-4 bg-black/20">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3">Teams Starting This Player</h3>
                {isLoadingTeams ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/30"></div>
                  </div>
                ) : startingTeams && startingTeams.length > 0 ? (
                  <div className="space-y-2">
                    {startingTeams.map((team) => (
                      <Link
                        key={team.teamId}
                        href={`/team/${team.teamId}?gw=${gw}`}
                        className="flex items-center justify-between bg-white/5 rounded px-3 py-2 hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">{team.teamName}</span>
                          <span className="text-[10px] text-white/50 truncate">{team.managerName}</span>
                        </div>
                        <div className="ml-3 flex flex-col items-end shrink-0">
                          <span className="text-xs font-bold text-white">{team.netPoints} pts</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-white/40 text-sm italic">
                    No other teams started this player
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

