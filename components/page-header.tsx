"use client";

import { GameweekSelector } from "@/components/gameweek-selector";

interface PageHeaderProps {
  title: string;
  description: string;
  currentGameweek: number;
  selectedGameweek: number;
  showGameweekSelector?: boolean;
}

export function PageHeader({
  title,
  description,
  currentGameweek,
  selectedGameweek,
  showGameweekSelector = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {showGameweekSelector && (
            <GameweekSelector 
              currentGameweek={currentGameweek}
              selectedGameweek={selectedGameweek}
              className="w-auto"
            />
          )}
        </div>
        <p className="text-sm text-white/60 mt-1">
          {description}
        </p>
      </div>
    </div>
  );
} 