"use client";

import React from "react";
import { GameweekSelector } from "@/components/gameweek-selector";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export interface TemplateTeamStat {
  id: number;
  name: string;
  managerName: string;
  averageOwnership: number; // 0..100
  playersCount: number;
}

export function TemplateLeaderboardClient({ data: initialData, currentGameweek, selectedGameweek }: { data: TemplateTeamStat[]; currentGameweek: number; selectedGameweek: number; }) {
  const [data, setData] = React.useState<TemplateTeamStat[]>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [selectedGw, setSelectedGw] = React.useState<number>(selectedGameweek);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTeam, setModalTeam] = React.useState<{ id: number; name: string; managerName: string } | null>(null);
  const [modalPlayers, setModalPlayers] = React.useState<Array<{ id: number; name: string; ownership: number; position: number }>>([]);
  const [modalLoading, setModalLoading] = React.useState(false);
  const searchParams = useSearchParams();

  const fetchData = React.useCallback(async (gw: number) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/template-leaderboard?gw=${gw}`, { cache: "no-store" });
      if (resp.ok) {
        const json = await resp.json();
        setData(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Watch the URL for ?gameweek changes and keep component state + data in sync
  React.useEffect(() => {
    const gwParam = searchParams.get('gameweek');
    const nextGw = gwParam ? parseInt(gwParam, 10) : selectedGameweek;
    if (!Number.isFinite(nextGw)) return;
    if (nextGw !== selectedGw) {
      setSelectedGw(nextGw);
      fetchData(nextGw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold text-white">Average Ownership of Entire Squad</CardTitle>
          <div className="flex items-center gap-2">
            <GameweekSelector currentGameweek={currentGameweek} selectedGameweek={selectedGw} className="w-24 sm:w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
        {loading && (
          <div className="px-6 pb-4 text-sm text-white/60">Loading…</div>
        )}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
                <TableHead className="w-12 text-gray-300 font-bold">Rank</TableHead>
                <TableHead className="text-gray-300 font-bold">Team</TableHead>
                <TableHead className="text-right text-gray-300 font-bold">Avg Ownership %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((team, index) => (
                <TableRow key={team.id} className={`border-white/5 transition-all cursor-pointer ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'} hover:bg-purple-900/20`} onClick={async () => {
                  setModalTeam({ id: team.id, name: team.name, managerName: team.managerName });
                  setModalPlayers([]);
                  setModalLoading(true);
                  setModalOpen(true);
                  try {
                    const resp = await fetch(`/api/template-leaderboard/team?teamId=${team.id}&gw=${selectedGw}`, { cache: "no-store" });
                    if (resp.ok) {
                      const json = await resp.json();
                      setModalPlayers(json.players || []);
                    }
                  } finally {
                    setModalLoading(false);
                  }
                }}>
                  <TableCell className="font-bold py-3">{index + 1}</TableCell>
                  <TableCell className="py-3">
                    <div>
                      <div className="font-medium text-white">{team.name}</div>
                      <div className="text-sm text-white/60">{team.managerName}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold py-3 text-white">{team.averageOwnership.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: Compact Table */}
        <div className="sm:hidden text-white text-xs rounded-lg overflow-hidden border border-white/10">
          {/* Header */}
          <div className="flex font-bold text-gray-300 px-2 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10.5px]">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">Team</div>
            <div className="w-16 text-right">Avg %</div>
          </div>
          {/* Rows */}
          <div className="overflow-y-auto">
            {data.map((team, index) => (
              <div
                key={team.id}
                className={`flex items-center px-2 py-1.5 cursor-pointer transition-all active:scale-[0.99] hover:bg-purple-900/20 border-b border-white/5 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'}`}
                onClick={async () => {
                    setModalTeam({ id: team.id, name: team.name, managerName: team.managerName });
                    setModalPlayers([]);
                    setModalLoading(true);
                    setModalOpen(true);
                    try {
                      const resp = await fetch(`/api/template-leaderboard/team?teamId=${team.id}&gw=${selectedGw}`, { cache: "no-store" });
                      if (resp.ok) {
                        const json = await resp.json();
                        setModalPlayers(json.players || []);
                      }
                    } finally {
                      setModalLoading(false);
                    }
                  }}
                >
                  <div className="w-8 flex items-center justify-center">
                    <span className="font-bold text-[10.5px]">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0 ml-2">
                    <div className="font-semibold text-[10.5px] truncate text-white leading-tight">{team.name}</div>
                    <div className="text-white/60 truncate text-[8.5px] leading-tight">{team.managerName}</div>
                  </div>
                  <div className="w-16 text-right font-bold text-[11.5px] text-white">{team.averageOwnership.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
      </CardContent>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 z-50" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="bg-gray-900 rounded-md w-full max-w-sm shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between px-2 py-2 border-b border-gray-700">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{modalTeam?.name}</div>
                <div className="text-[10px] text-white/60 truncate">{modalTeam?.managerName}</div>
                <div className="text-[10px] text-white/50 mt-0.5">GW {selectedGw}</div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-7 px-2 text-xs" onClick={() => setModalOpen(false)}>Close</Button>
            </div>
            <div className="px-2 py-2 max-h-[75vh] overflow-auto">
              {modalLoading ? (
                <div className="text-xs text-white/60">Loading players…</div>
              ) : (
                <div className="space-y-1.5">
                  {modalPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1">
                      <div className="text-[11px] text-white font-medium truncate">
                        {p.position <= 11 ? `#${p.position}` : `B${p.position - 11}`} · {p.name}
                      </div>
                      <div className="text-right font-bold text-[11px]">{p.ownership.toFixed(2)}%</div>
                    </div>
                  ))}
                  {modalPlayers.length === 0 && (
                    <div className="text-xs text-white/60">No players found.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}


