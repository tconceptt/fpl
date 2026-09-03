import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsSubpageHeaderSkeleton, LeaderboardSkeleton } from "@/components/stats/stats-skeletons";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <StatsSubpageHeaderSkeleton />
        <LeaderboardSkeleton rows={14} columns={4} />
      </div>
    </DashboardLayout>
  );
}
