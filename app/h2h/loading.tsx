import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { H2HSkeleton } from "@/components/h2h/h2h-skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <H2HSkeleton />
    </DashboardLayout>
  );
}
