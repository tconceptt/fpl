import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
        <p className="text-white text-lg font-medium">Loading gameweek winners...</p>
      </div>
    </DashboardLayout>
  );
}

