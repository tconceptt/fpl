"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recap } from "@/services/recap";

/** Recaps keyed by gameweek, shared across mounts so switching back is instant. */
const recapCache = new Map<number, Recap>();

/**
 * The gameweek recap (Phase 5.4) as a card. Fetches `/api/recap/[gw]` for
 * the gameweek the page is showing; the bot posts the same text — recap
 * copy (including any emoji) is bot-authored content and renders as-is.
 */
export function RecapCard({ gw }: { gw: number }) {
  const [recap, setRecap] = useState<Recap | null>(recapCache.get(gw) ?? null);
  const [loading, setLoading] = useState(!recapCache.has(gw));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = recapCache.get(gw);
    if (cached) {
      setRecap(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/recap/${gw}`)
      .then((res) => {
        if (!res.ok) throw new Error("Recap unavailable");
        return res.json();
      })
      .then((json: Recap) => {
        if (cancelled) return;
        recapCache.set(gw, json);
        setRecap(json);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Recap unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gw]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gameweek {gw} recap</CardTitle>
        {recap?.provisional && !loading && (
          <span className="text-xs font-normal text-fg-3">Provisional bonus</span>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-negative">{error}</p>}

        {!error && loading && (
          <div className="grid gap-4 sm:grid-cols-2" aria-label="Writing it up…">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            ))}
          </div>
        )}

        {!error && !loading && !recap && (
          <p className="text-sm text-fg-2">Recap unavailable.</p>
        )}

        {recap && !loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {recap.sections.map((section) => (
              <div key={section.title}>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                  {section.title}
                </div>
                <ul className="space-y-1 text-sm text-fg">
                  {section.lines.map((line, i) => (
                    <li key={i} className="leading-snug">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
