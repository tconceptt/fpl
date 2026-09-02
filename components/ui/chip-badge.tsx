"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

interface ChipBadgeProps {
  abbr: string;
  label: string;
  color: string;
  className?: string;
}

/**
 * A chip abbreviation pill that opens a Radix Popover on tap (and click),
 * showing the chip's full name. Replaces the hover-only Radix Tooltip used
 * previously, which never opens on touch devices.
 */
export function ChipBadge({ abbr, label, color, className }: ChipBadgeProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center min-h-6 min-w-6 text-xs font-bold px-1.5 py-0.5 rounded border leading-none",
            color,
            className
          )}
        >
          {abbr}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          className="z-50 overflow-hidden rounded-md border border-white/10 bg-black px-3 py-1.5 text-xs text-white shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {label}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
