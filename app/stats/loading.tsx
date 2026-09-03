import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsHubSkeleton } from "@/components/stats/stats-skeletons";

export default function Loading() {
  return (
    <DashboardLayout>
      <StatsHubSkeleton />
    </DashboardLayout>
  );
}
