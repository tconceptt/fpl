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
    <div className="flex flex-col space-y-1.5">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {showGameweekSelector && (
          <GameweekSelector 
            currentGameweek={currentGameweek}
            selectedGameweek={selectedGameweek}
            className="w-full max-w-[180px]"
          />
        )}
      </div>
      <p className="text-base text-white/60 sm:text-lg">
        {description}
      </p>
    </div>
  );
} 