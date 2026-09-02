import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 pt-2 sm:pt-6 px-3 sm:px-6">
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-8 w-[180px]" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 py-3 sm:py-6">
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
