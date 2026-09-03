import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsSubpageHeaderSkeleton, LeaderboardSkeleton } from "@/components/stats/stats-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <StatsSubpageHeaderSkeleton />
        <Card>
          <CardContent className="space-y-2 pt-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
        <LeaderboardSkeleton rows={14} columns={4} />
      </div>
    </DashboardLayout>
  );
}
