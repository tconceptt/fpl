"use client";

import * as React from "react";
import { GameweekSelector } from "@/components/gameweek-selector";

interface PageHeaderProps {
  title: string;
  description?: string;
  currentGameweek: number;
  selectedGameweek: number;
  showGameweekSelector?: boolean;
  onGameweekChange?: (gw: number) => void;
  actions?: React.ReactNode;
  /** @deprecated kept for legacy call sites; ignored. */
  simpleSelector?: boolean;
}

export function PageHeader({
  title,
  description,
  currentGameweek,
  selectedGameweek,
  showGameweekSelector = true,
  onGameweekChange,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-fg-2">{description}</p>
        )}
      </div>
      {(showGameweekSelector || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {showGameweekSelector && (
            <GameweekSelector
              currentGameweek={currentGameweek}
              selectedGameweek={selectedGameweek}
              onChange={onGameweekChange}
            />
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
