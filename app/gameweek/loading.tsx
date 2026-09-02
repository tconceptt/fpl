import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-[220px]" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-4 w-[160px]" />

        {/* Leader & Struggler */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 sm:pb-3 border-b border-white/10">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 sm:pb-3 border-b border-white/10">
                <Skeleton className="h-4 w-[110px]" />
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chip usage */}
        <Card>
          <CardHeader className="pb-3 border-b border-white/10">
            <Skeleton className="h-5 w-[110px]" />
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[110px] rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
