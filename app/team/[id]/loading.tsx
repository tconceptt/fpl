import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TeamPageSkeleton } from "@/components/team/team-page-skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <TeamPageSkeleton />
    </DashboardLayout>
  );
}
