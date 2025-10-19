"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GameweekNavProps {
  currentGameweek: number;
}

export function GameweekNav({ currentGameweek }: GameweekNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedGw = parseInt(searchParams.get("gw") || "1");

  const handlePrevGw = () => {
    if (selectedGw > 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("gw", String(selectedGw - 1));
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleNextGw = () => {
    if (selectedGw < currentGameweek) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("gw", String(selectedGw + 1));
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevGw}
        disabled={selectedGw <= 1}
        className="h-8 w-8 text-white/70 hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="text-sm font-semibold text-white min-w-[60px] text-center">
        GW {selectedGw}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextGw}
        disabled={selectedGw >= currentGameweek}
        className="h-8 w-8 text-white/70 hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

