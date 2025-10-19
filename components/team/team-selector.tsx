"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Team {
  entry: number;
  entry_name: string;
  player_name: string;
}

interface TeamSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (teamId: number) => void;
  currentTeamId: number;
  excludeTeamId?: number;
}

export function TeamSelector({ isOpen, onClose, onSelect, currentTeamId, excludeTeamId }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/league-teams");
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchQuery === "" || 
      team.entry_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.player_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const notExcluded = excludeTeamId ? team.entry !== excludeTeamId : true;
    
    return matchesSearch && notExcluded;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-gray-900 rounded-lg border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <h3 className="font-semibold text-white">Select Team to Compare</h3>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <input
            type="text"
            placeholder="Search teams or managers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-md text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Teams list */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-white/60">Loading teams...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 text-center text-white/60">No teams found</div>
          ) : (
            filteredTeams.map((team, index) => (
              <button
                key={team.entry}
                onClick={() => {
                  onSelect(team.entry);
                  onClose();
                }}
                className={cn(
                  "w-full px-4 py-3 text-left border-b border-white/5 transition-all",
                  index % 2 === 0 ? "bg-gray-800/50" : "bg-gray-900/50",
                  "hover:bg-purple-900/20 active:scale-[0.99]"
                )}
              >
                <div className="font-semibold text-white text-sm">{team.entry_name}</div>
                <div className="text-xs text-white/60 mt-0.5">{team.player_name}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

