"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Repeat } from "lucide-react";
import { BreakdownTable } from "./breakdown-table";
import { TeamSelector } from "./team-selector";

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
};

interface TeamData {
  teamId: string;
  teamName: string;
  managerName: string;
  overallRank: number | null;
  h2hRank: number | null;
  transfers: number;
  transferCost: number;
  startersTotal: number;
  players: Player[];
  seasonTotal: number;
  gamesPlayed: number;
}

interface TeamComparisonClientProps {
  team1: TeamData;
  team2: TeamData;
}

export function TeamComparisonClient({ team1, team2 }: TeamComparisonClientProps) {
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [selectingTeamSide, setSelectingTeamSide] = useState<1 | 2>(1);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleExitCompare = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSwitchTeam = (side: 1 | 2) => {
    setSelectingTeamSide(side);
    setShowTeamSelector(true);
  };

  const handleTeamSelect = (selectedTeamId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectingTeamSide === 1) {
      // Switch the base team (the one in the URL path)
      const compareTeamId = team2.teamId;
      router.push(`/team/${selectedTeamId}?gw=${params.get("gw")}&compare=${compareTeamId}`);
    } else {
      // Switch the compare team
      params.set("compare", selectedTeamId.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const getExcludedTeamId = () => {
    return selectingTeamSide === 1 ? Number(team2.teamId) : Number(team1.teamId);
  };

  const pointDifference = team1.startersTotal - team2.startersTotal;
  const team1AvgGW = team1.gamesPlayed > 0 ? (team1.seasonTotal / team1.gamesPlayed) : 0;
  const team2AvgGW = team2.gamesPlayed > 0 ? (team2.seasonTotal / team2.gamesPlayed) : 0;

  return (
    <>
      {/* Exit compare button */}
      <div className="mb-2.5">
        <button
          onClick={handleExitCompare}
          className="w-full px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98]"
        >
          Exit Comparison
        </button>
      </div>

      {/* Quick Stats Bar */}
      <div className="mb-3 bg-gradient-to-br from-purple-900/20 via-gray-900/40 to-red-900/20 border border-white/10 rounded-lg overflow-hidden">
        {/* Mobile: Stacked layout */}
        <div className="md:hidden">
          {/* Gameweek Difference - Full width on mobile */}
          <div className="p-3 text-center border-b border-white/10">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">This Gameweek</div>
            {pointDifference === 0 ? (
              <>
                <div className="text-2xl font-bold text-gray-400">Tied</div>
                <div className="text-[10px] text-white/40 mt-0.5">Both teams level</div>
              </>
            ) : pointDifference > 0 ? (
              <>
                <div className="text-2xl font-bold text-purple-400">{team1.startersTotal}</div>
                <div className="text-[10px] text-white/40 my-1">vs</div>
                <div className="text-lg font-semibold text-red-400/60">{team2.startersTotal}</div>
                <div className="text-[10px] text-purple-300 mt-2 font-semibold truncate">
                  {team1.teamName} ahead by {Math.abs(pointDifference)}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-purple-400/60">{team1.startersTotal}</div>
                <div className="text-[10px] text-white/40 my-1">vs</div>
                <div className="text-2xl font-bold text-red-400">{team2.startersTotal}</div>
                <div className="text-[10px] text-red-300 mt-2 font-semibold truncate">
                  {team2.teamName} ahead by {Math.abs(pointDifference)}
                </div>
              </>
            )}
          </div>

          {/* Season stats - 2 columns on mobile */}
          <div className="grid grid-cols-2 divide-x divide-white/10">
            <div className="p-3 text-center">
              <div className="text-xs text-white/50 uppercase tracking-wide mb-1.5">Season Total</div>
              <div className="space-y-1">
                <div className={cn("text-base font-bold", team1.seasonTotal > team2.seasonTotal ? "text-purple-300" : "text-purple-400/60")}>
                  {team1.seasonTotal}
                </div>
                <div className="text-[9px] text-white/40">vs</div>
                <div className={cn("text-base font-bold", team2.seasonTotal > team1.seasonTotal ? "text-red-300" : "text-red-400/60")}>
                  {team2.seasonTotal}
                </div>
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-xs text-white/50 uppercase tracking-wide mb-1.5">Avg per GW</div>
              <div className="space-y-1">
                <div className={cn("text-base font-bold", team1AvgGW > team2AvgGW ? "text-purple-300" : "text-purple-400/60")}>
                  {team1AvgGW.toFixed(1)}
                </div>
                <div className="text-[9px] text-white/40">vs</div>
                <div className={cn("text-base font-bold", team2AvgGW > team1AvgGW ? "text-red-300" : "text-red-400/60")}>
                  {team2AvgGW.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: 3-column layout */}
        <div className="hidden md:grid md:grid-cols-3 divide-x divide-white/10">
          {/* Gameweek Difference */}
          <div className="p-4 text-center">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-2">This Gameweek</div>
            {pointDifference === 0 ? (
              <>
                <div className="text-2xl font-bold text-gray-400">Tied</div>
                <div className="text-[10px] text-white/40 mt-1">Both teams level</div>
              </>
            ) : pointDifference > 0 ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="text-2xl font-bold text-purple-400">{team1.startersTotal}</div>
                  <div className="text-xs text-white/40">vs</div>
                  <div className="text-lg font-semibold text-red-400/60">{team2.startersTotal}</div>
                </div>
                <div className="text-xs text-purple-300 font-semibold truncate mt-2">
                  {team1.teamName}
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  ahead by {Math.abs(pointDifference)} {Math.abs(pointDifference) === 1 ? "pt" : "pts"}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="text-lg font-semibold text-purple-400/60">{team1.startersTotal}</div>
                  <div className="text-xs text-white/40">vs</div>
                  <div className="text-2xl font-bold text-red-400">{team2.startersTotal}</div>
                </div>
                <div className="text-xs text-red-300 font-semibold truncate mt-2">
                  {team2.teamName}
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  ahead by {Math.abs(pointDifference)} {Math.abs(pointDifference) === 1 ? "pt" : "pts"}
                </div>
              </>
            )}
          </div>

          {/* Season Total */}
          <div className="p-4">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-2 text-center">Season Total</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <div className={cn("text-lg font-bold mb-1", team1.seasonTotal > team2.seasonTotal ? "text-purple-300" : "text-purple-400/60")}>
                  {team1.seasonTotal}
                </div>
                <div className="text-[9px] text-white/40 truncate">{team1.teamName}</div>
              </div>
              <div className="text-white/30 text-xs">vs</div>
              <div className="flex-1 text-center">
                <div className={cn("text-lg font-bold mb-1", team2.seasonTotal > team1.seasonTotal ? "text-red-300" : "text-red-400/60")}>
                  {team2.seasonTotal}
                </div>
                <div className="text-[9px] text-white/40 truncate">{team2.teamName}</div>
              </div>
            </div>
          </div>

          {/* Average GW Score */}
          <div className="p-4">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-2 text-center">Avg per GW</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <div className={cn("text-lg font-bold mb-1", team1AvgGW > team2AvgGW ? "text-purple-300" : "text-purple-400/60")}>
                  {team1AvgGW.toFixed(1)}
                </div>
                <div className="text-[9px] text-white/40 truncate">{team1.teamName}</div>
              </div>
              <div className="text-white/30 text-xs">vs</div>
              <div className="flex-1 text-center">
                <div className={cn("text-lg font-bold mb-1", team2AvgGW > team1AvgGW ? "text-red-300" : "text-red-400/60")}>
                  {team2AvgGW.toFixed(1)}
                </div>
                <div className="text-[9px] text-white/40 truncate">{team2.teamName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {/* Team 1 */}
        <div className="space-y-1.5 md:space-y-2.5">
          {/* Team header with selector */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-lg p-1.5 md:p-2.5">
            <button
              onClick={() => handleSwitchTeam(1)}
              className="w-full text-left hover:bg-white/5 rounded p-1 md:p-1.5 transition-colors group"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate group-hover:text-purple-300 transition-colors">
                    {team1.teamName}
                  </div>
                  <div className="text-[9px] md:text-[10px] text-white/60 truncate">{team1.managerName}</div>
                </div>
                <div className="text-[10px] md:text-xs text-white/40 group-hover:text-white/60 flex-shrink-0">
                  <Repeat className="w-3 h-3" />
                </div>
              </div>
            </button>
            
            <div className="flex items-center justify-between gap-1 md:gap-2 mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {team1.overallRank && (
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">Overall</span>
                    <span className="text-[10px] md:text-xs font-bold text-white">{team1.overallRank.toLocaleString()}</span>
                  </div>
                )}
                {team1.h2hRank && (
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">H2H</span>
                    <span className="text-[10px] md:text-xs font-bold text-white">#{team1.h2hRank}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">Trans</span>
                  <span className="text-[10px] md:text-xs font-bold text-white">
                    {team1.transfers}
                    {team1.transferCost > 0 && (
                      <span className="text-red-400 ml-0.5">(-{team1.transferCost})</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">GW</span>
                <span className="text-base md:text-xl font-bold text-green-400">{team1.startersTotal}</span>
              </div>
            </div>
          </div>

          <BreakdownTable players={team1.players} compact />
        </div>

        {/* Team 2 */}
        <div className="space-y-1.5 md:space-y-2.5">
          {/* Team header with selector */}
          <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border border-red-500/20 rounded-lg p-1.5 md:p-2.5">
            <button
              onClick={() => handleSwitchTeam(2)}
              className="w-full text-left hover:bg-white/5 rounded p-1 md:p-1.5 transition-colors group"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate group-hover:text-red-300 transition-colors">
                    {team2.teamName}
                  </div>
                  <div className="text-[9px] md:text-[10px] text-white/60 truncate">{team2.managerName}</div>
                </div>
                <div className="text-[10px] md:text-xs text-white/40 group-hover:text-white/60 flex-shrink-0">
                  <Repeat className="w-3 h-3" />
                </div>
              </div>
            </button>
            
            <div className="flex items-center justify-between gap-1 md:gap-2 mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {team2.overallRank && (
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">Overall</span>
                    <span className="text-[10px] md:text-xs font-bold text-white">{team2.overallRank.toLocaleString()}</span>
                  </div>
                )}
                {team2.h2hRank && (
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">H2H</span>
                    <span className="text-[10px] md:text-xs font-bold text-white">#{team2.h2hRank}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">Trans</span>
                  <span className="text-[10px] md:text-xs font-bold text-white">
                    {team2.transfers}
                    {team2.transferCost > 0 && (
                      <span className="text-red-400 ml-0.5">(-{team2.transferCost})</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] md:text-[9px] text-white/50 uppercase tracking-wide">GW</span>
                <span className="text-base md:text-xl font-bold text-green-400">{team2.startersTotal}</span>
              </div>
            </div>
          </div>

          <BreakdownTable players={team2.players} compact />
        </div>
      </div>

      <TeamSelector
        isOpen={showTeamSelector}
        onClose={() => setShowTeamSelector(false)}
        onSelect={handleTeamSelect}
        excludeTeamId={getExcludedTeamId()}
      />
    </>
  );
}

