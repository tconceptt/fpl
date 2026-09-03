"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

type ChipMeta = {
  abbr: string;
  label: string;
  className: string;
};

const CHIP_META: Record<string, ChipMeta> = {
  wildcard: {
    abbr: "WC",
    label: "Wildcard",
    className: "bg-positive-soft text-positive border-[rgba(61,220,151,0.3)]",
  },
  "3xc": {
    abbr: "TC",
    label: "Triple Captain",
    className: "bg-violet-soft text-violet border-[rgba(167,139,250,0.3)]",
  },
  bboost: {
    abbr: "BB",
    label: "Bench Boost",
    className: "bg-info-soft text-info border-[rgba(96,165,250,0.3)]",
  },
  freehit: {
    abbr: "FH",
    label: "Free Hit",
    className: "bg-rose-soft text-rose border-[rgba(244,114,182,0.3)]",
  },
};

/** Fixed chip color mapping: wildcard = positive, 3xc = violet, bboost = info, freehit = rose. */
export function chipMeta(name: string): ChipMeta {
  return (
    CHIP_META[name] ?? {
      abbr: name.slice(0, 2).toUpperCase(),
      label: name,
      className: "bg-surface-2 text-fg-2 border-border",
    }
  );
}

/**
 * A chip abbreviation pill that opens a Radix Popover on tap (and click),
 * showing the chip's full name. Tap target is at least 28px square.
 */
export function ChipBadge({
  chip,
  className,
}: {
  chip: string;
  className?: string;
}) {
  const meta = chipMeta(chip);

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex min-h-7 min-w-7 items-center justify-center rounded-sm border px-1.5 py-0.5 text-xs font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            meta.className,
            className
          )}
        >
          {meta.abbr}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          className="z-50 overflow-hidden rounded-md border border-border bg-surface-3 px-3 py-1.5 text-xs text-fg shadow-pop animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {meta.label}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
