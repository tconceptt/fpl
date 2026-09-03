import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared between app/loading.tsx and the Suspense fallback inside
 * app/page.tsx so the initial navigation skeleton and the streamed-in
 * fallback are pixel-identical (no layout shift on hydration).
 *
 * PageHeader + the standings Card live inside the same client boundary in
 * league-table.tsx (the gameweek selector's state is owned by useLeague,
 * which only exists there), so this skeleton mirrors both together.
 */
export function LeagueTableSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-12 items-center gap-3 border-b border-border bg-surface-2 px-4 sm:px-5">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-16 flex-1" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex h-14 items-center gap-3 px-4 sm:px-5">
                <Skeleton className="h-4 w-5 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
