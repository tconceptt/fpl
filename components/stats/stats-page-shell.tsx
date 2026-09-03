import type { ReactNode } from "react";

import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/page-header";

/**
 * Shared chrome for every /stats sub-page: BackButton (to /stats) + PageHeader
 * + content. Keeps all seven sub-pages visually identical (docs/DESIGN.md §5).
 */
export function StatsPageShell({
  title,
  description,
  currentGameweek = 1,
  selectedGameweek = 1,
  showGameweekSelector = true,
  onGameweekChange,
  actions,
  children,
}: {
  title: string;
  description?: string;
  currentGameweek?: number;
  selectedGameweek?: number;
  showGameweekSelector?: boolean;
  onGameweekChange?: (gw: number) => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <BackButton href="/stats" />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={title}
            description={description}
            currentGameweek={currentGameweek}
            selectedGameweek={selectedGameweek}
            showGameweekSelector={showGameweekSelector}
            onGameweekChange={onGameweekChange}
            actions={actions}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
