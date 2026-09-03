import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsSubpageHeaderSkeleton } from "@/components/stats/stats-skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <StatsSubpageHeaderSkeleton />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
