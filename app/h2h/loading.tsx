import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-[220px]" />

        <Card>
          <CardHeader className="pb-3 border-b border-white/10">
            <Skeleton className="h-5 w-[160px]" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b border-white/10">
            <Skeleton className="h-5 w-[110px]" />
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
