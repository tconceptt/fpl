"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Repeat } from "lucide-react";
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

export function TeamBreakdownClient({ players, teamId, activeChip }: { players: Player[]; teamId: string; activeChip: string | null }) {
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTeamSelect = (selectedTeamId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("compare", selectedTeamId.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setShowTeamSelector(true)}
        className="w-full gap-2"
      >
        <Repeat className="h-4 w-4" />
        Compare with another team
      </Button>

      <BreakdownTable players={players} activeChip={activeChip} />

      <TeamSelector
        isOpen={showTeamSelector}
        onClose={() => setShowTeamSelector(false)}
        onSelect={handleTeamSelect}
        excludeTeamId={Number(teamId)}
        gw={searchParams.get("gw") ?? ""}
      />
    </div>
  );
}
