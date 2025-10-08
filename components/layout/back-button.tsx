"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.push("/")}
      className="text-white/70 hover:text-white"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
