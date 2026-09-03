"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
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
  excludeTeamId?: number;
  /** The gameweek to read the league's team list from, via `/api/league/[gw]`. */
  gw: string;
}

export function TeamSelector({ isOpen, onClose, onSelect, excludeTeamId, gw }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && gw) {
      fetchTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, gw]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/league/${gw}`);

      if (response.ok) {
        const data = await response.json();
        const standings: Array<{ entry: number; entry_name: string; player_name: string }> =
          data.standings || [];
        setTeams(
          standings.map((s) => ({
            entry: s.entry,
            entry_name: s.entry_name,
            player_name: s.player_name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      searchQuery === "" ||
      team.entry_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.player_name.toLowerCase().includes(searchQuery.toLowerCase());

    const notExcluded = excludeTeamId ? team.entry !== excludeTeamId : true;

    return matchesSearch && notExcluded;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface-3 shadow-pop">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-fg">Select team to compare</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <input
            type="text"
            placeholder="Search teams or managers…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-fg-2">Loading teams…</div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 text-center text-sm text-fg-2">No teams found</div>
          ) : (
            filteredTeams.map((team) => (
              <button
                key={team.entry}
                type="button"
                onClick={() => {
                  onSelect(team.entry);
                  onClose();
                }}
                className={cn(
                  "flex w-full min-h-12 flex-col items-start px-4 py-3 text-left transition-colors",
                  "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                )}
              >
                <span className="truncate text-sm font-medium text-fg">{team.entry_name}</span>
                <span className="truncate text-xs text-fg-3">{team.player_name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
