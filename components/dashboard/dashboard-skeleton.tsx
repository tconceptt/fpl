import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the shape of the dashboard's data-dependent section (season strip
 * + 3-up StatTile row + reigning champion/qitawrari pair) exactly. Shared
 * between the Suspense fallback in app/dashboard/page.tsx and
 * app/dashboard/loading.tsx so there's no layout shift either way.
 */
export function DashboardDataSkeleton() {
  return (
    <>
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 sm:p-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="ml-auto h-6 w-16 rounded-full" />
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-40" />
          </Card>
        ))}
      </div>
    </>
  );
}
