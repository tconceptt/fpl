"use client";

import { getKitForTeam } from "@/lib/team-kits";
import { cn } from "@/lib/utils";

interface JerseyProps {
  teamId?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Jersey({ teamId, size = "md", className }: JerseyProps) {
  const kit = getKitForTeam(teamId ?? null);
  const dimensions =
    size === "sm"
      ? { w: 36, h: 36 }
      : size === "lg"
      ? { w: 64, h: 64 }
      : { w: 48, h: 48 };

  return (
    <div
      className={cn("relative rounded-full shadow-md ring-1 ring-white/10 overflow-hidden", className)}
      style={{ width: dimensions.w, height: dimensions.h, background: kit.primary }}
      aria-label="club-jersey"
    >
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2"
        style={{ width: Math.max(6, Math.floor(dimensions.w * 0.18)), background: kit.secondary, opacity: 0.9 }}
      />
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-b-md"
        style={{ width: Math.floor(dimensions.w * 0.6), height: Math.floor(dimensions.h * 0.22), background: kit.secondary, opacity: 0.85 }}
      />
    </div>
  );
}


