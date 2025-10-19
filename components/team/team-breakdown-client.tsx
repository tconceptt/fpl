"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

export function TeamBreakdownClient({ players, teamId }: { players: Player[]; teamId: string }) {
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleCompareClick = () => {
    setShowTeamSelector(true);
  };

  const handleTeamSelect = (selectedTeamId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("compare", selectedTeamId.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      {/* Compare button */}
      <div className="mb-2.5">
        <button
          onClick={handleCompareClick}
          className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98]"
        >
          Compare with another team
        </button>
      </div>

      <BreakdownTable players={players} />

      <TeamSelector
        isOpen={showTeamSelector}
        onClose={() => setShowTeamSelector(false)}
        onSelect={handleTeamSelect}
        currentTeamId={Number(teamId)}
        excludeTeamId={Number(teamId)}
      />
    </>
  );
}
