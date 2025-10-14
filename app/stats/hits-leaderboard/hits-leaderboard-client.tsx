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
    <div className="text-white text-xs rounded-lg overflow-hidden border border-white/10">
      {/* Header */}
      <div className="flex font-bold text-gray-300 px-2 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10.5px]">
        <div className="w-8 text-center">#</div>
        <div className="flex-1">Team</div>
        <div className="w-10 text-center leading-tight"><div>GWs</div><div className="text-[9px]">Hits</div></div>
        <div className="w-10 text-center leading-tight"><div>Total</div><div className="text-[9px]">Trans</div></div>
        <div className="w-12 text-right">Cost</div>
      </div>
      {/* Rows */}
      <div className="overflow-y-auto">
        {hitsStats.map((team, index) => (
          <div
            key={team.id}
            className={`flex items-center px-2 py-1.5 cursor-pointer transition-all active:scale-[0.99] hover:bg-purple-900/20 border-b border-white/5 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'}`}
            onClick={() => onTeamClick(team)}
          >
            <div className="w-8 flex items-center justify-center">
              <span className="font-bold text-[10.5px]">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0 ml-2">
              <div className="font-semibold text-[10.5px] truncate text-white leading-tight">{team.name}</div>
              <div className="text-white/60 truncate text-[8.5px] leading-tight">{team.managerName}</div>
            </div>
            <div className="w-10 text-center font-semibold text-[10.5px]">
              {team.gameweeksWithHits}
            </div>
            <div className="w-10 text-center font-semibold text-[10.5px]">
              {team.totalTransfers}
            </div>
            <div className="w-12 text-right font-bold text-[11.5px] text-white">
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
      <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
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
        <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
          {/* Mobile View - Compact */}
          <div className="sm:hidden">
            <CompactHitsView hitsStats={sortedHitsStats} onTeamClick={handleTeamClick} />
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
                  <TableHead className="w-12 text-gray-300 font-bold">Rank</TableHead>
                  <TableHead className="text-gray-300 font-bold">Team</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">GWs with Hits</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Total Transfers</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHitsStats.map((team: HitsStats, index: number) => (
                  <TableRow key={team.id} className={`border-white/5 transition-all cursor-pointer ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'} hover:bg-purple-900/20`} onClick={() => handleTeamClick(team)}>
                    <TableCell className="font-bold py-3">{index + 1}</TableCell>
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium text-white">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold py-3 text-white">{team.gameweeksWithHits}</TableCell>
                    <TableCell className="text-right font-bold py-3 text-white">{team.totalTransfers}</TableCell>
                    <TableCell className="text-right font-bold py-3 text-white">{formatPoints(team.totalTransferCost)}</TableCell>
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
