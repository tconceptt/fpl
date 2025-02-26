import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-8 mt-6">
        {/* Hero skeleton */}
        <Skeleton className="h-[300px] w-full" />

        {/* Navigation card skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Image slideshow skeleton */}
        <Skeleton className="h-[250px] w-full" />

        {/* Cards grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-[150px]" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-8 w-[180px]" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-[150px]" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roast generator skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[180px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-[100px] w-full" />
              <div className="flex justify-end">
                <Skeleton className="h-10 w-[120px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hall of Qitawrari skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 