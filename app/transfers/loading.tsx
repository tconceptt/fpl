import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TransfersSkeleton } from "@/components/transfers/transfers-skeleton";

export default function Loading() {
  return (
    <DashboardLayout>
      <TransfersSkeleton />
    </DashboardLayout>
  );
}
