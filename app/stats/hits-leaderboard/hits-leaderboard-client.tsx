"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, X } from "lucide-react";
import { formatPoints } from "@/lib/fpl";

interface HitsStats {
  id: number;
  name: string;
  managerName: string;
  gameweeksWithHits: number;
  totalTransferCost: number;
  totalTransfers: number;
  gameweekHits: Array<{
    gameweek: number;
    transfers: number;
    cost: number;
  }>;
}

interface HitsLeaderboardClientProps {
  hitsStats: HitsStats[];
}

type SortOption = "cost" | "transfers";

function HitsDetailModal({ team, isOpen, onClose }: { team: HitsStats | null; isOpen: boolean; onClose: () => void }) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">{team.name}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-4">{team.managerName}</div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-white mb-2">Hits by Gameweek:</div>
            {team.gameweekHits.length > 0 ? (
              <div className="space-y-1">
                {team.gameweekHits.map((hit) => (
                  <div key={hit.gameweek} className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
                    <span className="text-white font-medium">GW {hit.gameweek}</span>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">-{formatPoints(hit.cost)} Pts </div>
                      <div className="text-xs text-gray-400">{hit.transfers} transfers</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No hits taken</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactHitsView({ hitsStats, onTeamClick }: { hitsStats: HitsStats[]; onTeamClick: (team: HitsStats) => void }) {
  return (
    <div className="text-white text-xs">
      <div className="flex font-bold text-gray-400 px-2 py-1 border-b border-gray-700 items-center">
        <div className="w-8 text-center">#</div>
        <div className="flex-1">Team</div>
        <div className="w-12 text-center leading-tight"><div>GWs</div><div>Hits</div></div>
        <div className="w-12 text-center leading-tight"><div>Total</div><div>Transfers</div></div>
        <div className="w-12 text-right">Cost</div>
      </div>
      <div className="overflow-y-auto">
        {hitsStats.map((team, index) => (
          <div
            key={team.id}
            className={`flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-700/50 transition-colors ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}`}
            onClick={() => onTeamClick(team)}
          >
            <div className="w-8 text-center">
              <span className="font-bold">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0 ml-2">
              <div className="font-bold">{team.name}</div>
              <div className="text-gray-400 truncate text-[10px]">{team.managerName}</div>
            </div>
            <div className="w-12 text-center font-medium">
              {team.gameweeksWithHits}
            </div>
            <div className="w-12 text-center font-medium">
              {team.totalTransfers}
            </div>
            <div className="w-12 text-right font-bold">
              {formatPoints(team.totalTransferCost)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HitsLeaderboardClient({ hitsStats }: HitsLeaderboardClientProps) {
  const [selectedTeam, setSelectedTeam] = useState<HitsStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("cost");

  const handleTeamClick = (team: HitsStats) => {
    setSelectedTeam(team);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTeam(null);
  };

  // Sort the hits stats based on the selected option
  const sortedHitsStats = [...hitsStats].sort((a, b) => {
    if (sortBy === "transfers") {
      return b.totalTransfers - a.totalTransfers;
    } else {
      return b.totalTransferCost - a.totalTransferCost;
    }
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-red-500" />
              Transfer Hits Taken
            </CardTitle>
            
            {/* Desktop: Button group */}
            <div className="hidden sm:flex gap-2">
              <Button
                variant={sortBy === "cost" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("cost")}
                className="text-xs"
              >
                Sort by Cost
              </Button>
              <Button
                variant={sortBy === "transfers" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("transfers")}
                className="text-xs"
              >
                Sort by Transfers
              </Button>
            </div>

            {/* Mobile: Dropdown */}
            <div className="sm:hidden w-full">
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost">Sort by Cost</SelectItem>
                  <SelectItem value="transfers">Sort by Transfers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Mobile View - Compact */}
          <div className="sm:hidden">
            <CompactHitsView hitsStats={sortedHitsStats} onTeamClick={handleTeamClick} />
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">GWs with Hits</TableHead>
                  <TableHead className="text-right text-white/60">Total Transfers</TableHead>
                  <TableHead className="text-right text-white/60">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHitsStats.map((team: HitsStats, index: number) => (
                  <TableRow key={team.id} className="border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => handleTeamClick(team)}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{team.gameweeksWithHits}</TableCell>
                    <TableCell className="text-right font-bold">{team.totalTransfers}</TableCell>
                    <TableCell className="text-right font-bold">{formatPoints(team.totalTransferCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <HitsDetailModal 
        team={selectedTeam} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </>
  );
}
