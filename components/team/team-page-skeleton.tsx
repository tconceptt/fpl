import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors app/team/[id]/page.tsx's TeamPageContent: BackButton + PageHeader,
 * the stat-tile row, and the breakdown table (single-team shape; the
 * comparison shape swaps in a second column of the same skeleton). Shared
 * between the Suspense fallback there and app/team/[id]/loading.tsx.
 */
export function TeamPageSkeleton({ compare = false }: { compare?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-start gap-2">
        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="hidden h-9 w-36 shrink-0 rounded-md sm:block" />
      </div>

      {!compare && (
        <Card className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </Card>
      )}

      <div className={compare ? "grid grid-cols-1 gap-4 md:grid-cols-2" : ""}>
        <BreakdownSkeleton />
        {compare && <BreakdownSkeleton />}
      </div>
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <Card className="p-0">
      <CardContent className="divide-y divide-border p-0">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <Skeleton className="h-6 w-6 shrink-0 rounded" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-6 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
