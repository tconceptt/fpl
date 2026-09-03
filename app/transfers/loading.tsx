import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[160px]" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-[260px]" />
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Skeleton className="h-[110px] rounded-lg" />
          <Skeleton className="h-[110px] rounded-lg" />
        </div>
        <Card>
          <CardHeader className="pb-3 border-b border-white/10">
            <Skeleton className="h-5 w-[180px]" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
