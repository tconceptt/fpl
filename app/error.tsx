"use client";

import { AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardLayout>
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't reach the FPL API"
        description={error.message || "Something went wrong while loading this page."}
        action={
          <Button variant="primary" size="sm" onClick={() => reset()}>
            Retry
          </Button>
        }
      />
    </DashboardLayout>
  );
}
