import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardDataSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 sm:gap-8">
        <PageHeader title="Dashboard" showGameweekSelector={false} currentGameweek={0} selectedGameweek={0} />

        <DashboardDataSkeleton />

        <Card className="divide-y divide-border p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Skeleton className="h-5 w-5 shrink-0 rounded-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-44" />
              </div>
              <Skeleton className="h-4 w-4 shrink-0" />
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  );
}
