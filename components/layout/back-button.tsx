"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to league table if no history
      router.push("/");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
