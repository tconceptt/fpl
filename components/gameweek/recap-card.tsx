"use client";

import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recap } from "@/services/recap";

/** Recaps keyed by gameweek, shared across mounts so switching back is instant. */
const recapCache = new Map<number, Recap>();

/**
 * The gameweek recap (Phase 5.4) as a card. Fetches `/api/recap/[gw]` for
 * the gameweek the page is showing; the bot posts the same text.
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
    <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
          <ScrollText className="h-5 w-5 text-purple-400" />
          Gameweek {gw} recap
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
          {recap?.provisional && !loading && (
            <span className="ml-auto text-xs font-normal text-amber-300/80">provisional bonus</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 sm:pt-6">
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!error && !recap && loading && <p className="text-sm text-white/50">Writing it up…</p>}
        {recap && (
          <div className="grid gap-4 sm:grid-cols-2">
            {recap.sections.map((section) => (
              <div key={section.title}>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-1">{section.title}</div>
                <ul className="space-y-1 text-sm text-white/90">
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
