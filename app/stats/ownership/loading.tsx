import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[220px]" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-[260px]" />
        <Skeleton className="h-4 w-24" />
        <Card>
          <CardHeader className="pb-3 border-b border-white/10">
            <Skeleton className="h-5 w-[140px]" />
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
