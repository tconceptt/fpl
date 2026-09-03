"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/fpl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  clubShortName?: string;
  clubCode?: number;
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
  activeChip: string | null;
}

interface TeamComparisonClientProps {
  team1: TeamData;
  team2: TeamData;
}

function CompareStat({
  label,
  aValue,
  aLabel,
  bValue,
  bLabel,
  format = (v: number) => formatPoints(v),
}: {
  label: string;
  aValue: number;
  aLabel: string;
  bValue: number;
  bLabel: string;
  format?: (v: number) => string;
}) {
  const aWins = aValue > bValue;
  const bWins = bValue > aValue;
  return (
    <div className="p-4 text-center sm:p-5">
      <div className="mb-2 text-xs text-fg-2">{label}</div>
      <div className="flex items-center justify-center gap-3">
        <div className="min-w-0 flex-1 text-right">
          <div className={cn("text-lg font-semibold tabular-nums", aWins ? "text-accent" : "text-fg-2")}>
            {format(aValue)}
          </div>
          <div className="truncate text-xs text-fg-3">{aLabel}</div>
        </div>
        <div className="shrink-0 text-xs text-fg-3">vs</div>
        <div className="min-w-0 flex-1 text-left">
          <div className={cn("text-lg font-semibold tabular-nums", bWins ? "text-accent" : "text-fg-2")}>
            {format(bValue)}
          </div>
          <div className="truncate text-xs text-fg-3">{bLabel}</div>
        </div>
      </div>
    </div>
  );
}

function TeamSideHeader({ team, onSwitch }: { team: TeamData; onSwitch: () => void }) {
  return (
    <Card className="p-3 sm:p-4">
      <button
        type="button"
        onClick={onSwitch}
        className="flex w-full items-center justify-between gap-2 rounded-md p-1 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-fg">{team.teamName}</div>
          <div className="truncate text-xs text-fg-3">{team.managerName}</div>
        </div>
        <Repeat className="h-3.5 w-3.5 shrink-0 text-fg-3" />
      </button>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex flex-wrap items-center gap-3">
          {team.overallRank && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-fg-3">Overall</span>
              <span className="text-xs font-semibold tabular-nums text-fg">{team.overallRank.toLocaleString()}</span>
            </div>
          )}
          {team.h2hRank && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-fg-3">H2H</span>
              <span className="text-xs font-semibold tabular-nums text-fg">#{team.h2hRank}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-fg-3">Transfers</span>
            <span className="text-xs font-semibold tabular-nums text-fg">
              {team.transfers}
              {team.transferCost > 0 && <span className="ml-0.5 text-negative">(-{team.transferCost})</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wide text-fg-3">GW</span>
          <span className="text-lg font-semibold tabular-nums text-positive">{team.startersTotal}</span>
        </div>
      </div>
    </Card>
  );
}

export function TeamComparisonClient({ team1, team2 }: TeamComparisonClientProps) {
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [selectingTeamSide, setSelectingTeamSide] = useState<1 | 2>(1);
  const [activeSide, setActiveSide] = useState<1 | 2>(1);
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
      const compareTeamId = team2.teamId;
      router.push(`/team/${selectedTeamId}?gw=${params.get("gw")}&compare=${compareTeamId}`);
    } else {
      params.set("compare", selectedTeamId.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const getExcludedTeamId = () => (selectingTeamSide === 1 ? Number(team2.teamId) : Number(team1.teamId));

  const team1AvgGW = team1.gamesPlayed > 0 ? team1.seasonTotal / team1.gamesPlayed : 0;
  const team2AvgGW = team2.gamesPlayed > 0 ? team2.seasonTotal / team2.gamesPlayed : 0;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <Button type="button" variant="secondary" onClick={handleExitCompare} className="w-full gap-2 sm:w-auto sm:self-start">
        <ArrowLeft className="h-4 w-4" />
        Exit comparison
      </Button>

      <Card className="divide-y divide-border sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <CompareStat label="This gameweek" aValue={team1.startersTotal} aLabel={team1.teamName} bValue={team2.startersTotal} bLabel={team2.teamName} />
        <CompareStat label="Season total" aValue={team1.seasonTotal} aLabel={team1.teamName} bValue={team2.seasonTotal} bLabel={team2.teamName} />
        <CompareStat
          label="Avg per GW"
          aValue={team1AvgGW}
          aLabel={team1.teamName}
          bValue={team2AvgGW}
          bLabel={team2.teamName}
          format={(v) => v.toFixed(1)}
        />
      </Card>

      {/* Mobile team switcher — one team's breakdown visible at a time below md */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-bg px-4 py-2 sm:hidden">
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => setActiveSide(1)}
            className={cn(
              "flex flex-1 items-center justify-between gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              activeSide === 1 ? "bg-accent text-accent-fg" : "text-fg-2 hover:text-fg"
            )}
          >
            <span className="truncate">{team1.teamName}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums">{team1.startersTotal}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSide(2)}
            className={cn(
              "flex flex-1 items-center justify-between gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              activeSide === 2 ? "bg-accent text-accent-fg" : "text-fg-2 hover:text-fg"
            )}
          >
            <span className="truncate">{team2.teamName}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums">{team2.startersTotal}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className={cn("flex flex-col gap-2", activeSide === 2 && "hidden md:flex")}>
          <TeamSideHeader team={team1} onSwitch={() => handleSwitchTeam(1)} />
          <BreakdownTable players={team1.players} compact activeChip={team1.activeChip} />
        </div>
        <div className={cn("flex flex-col gap-2", activeSide === 1 && "hidden md:flex")}>
          <TeamSideHeader team={team2} onSwitch={() => handleSwitchTeam(2)} />
          <BreakdownTable players={team2.players} compact activeChip={team2.activeChip} />
        </div>
      </div>

      <TeamSelector
        isOpen={showTeamSelector}
        onClose={() => setShowTeamSelector(false)}
        onSelect={handleTeamSelect}
        excludeTeamId={getExcludedTeamId()}
        gw={searchParams.get("gw") ?? ""}
      />
    </div>
  );
}
