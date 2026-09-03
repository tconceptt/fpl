import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeagueTableSkeleton } from "@/components/league-table/league-table-skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <LeagueTableSkeleton />
    </DashboardLayout>
  );
}
