import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GameweekSkeleton } from "@/components/gameweek/gameweek-skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <GameweekSkeleton />
    </DashboardLayout>
  );
}
