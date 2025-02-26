import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-6 w-[200px]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px]" />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-[150px]" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px]" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-[150px]" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px]" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 