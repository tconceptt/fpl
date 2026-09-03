import Link from "next/link";
import { SearchX } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <DashboardLayout>
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="This page doesn't exist, or the team ID isn't in the league."
        action={
          <Button variant="primary" size="sm" asChild>
            <Link href="/">Back to league</Link>
          </Button>
        }
      />
    </DashboardLayout>
  );
}
