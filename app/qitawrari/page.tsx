import { Timer } from "lucide-react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ImageSlideshow } from "./image-slideshow";
import { leagueConfig } from "@/config/league";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function daysUntil(targetDate: Date): number {
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function getCupCountdown(): Promise<{ days: number | null; underway: boolean; announced: boolean }> {
  const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());

  const cupEventId = bootstrap.game_settings?.cup_start_event_id;
  if (!cupEventId) {
    return { days: null, underway: false, announced: false };
  }

  const cupEvent = bootstrap.events.find((e) => e.id === cupEventId);
  if (!cupEvent?.deadline_time) {
    return { days: null, underway: false, announced: false };
  }

  const days = daysUntil(new Date(cupEvent.deadline_time));
  if (days < 0) {
    return { days: null, underway: true, announced: true };
  }

  return { days, underway: false, announced: true };
}

export default async function QitawrariPage() {
  const cupCountdown = await withUpstreamCounter(async () => {
    const result = await getCupCountdown();
    logTelemetry("/qitawrari");
    return result;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 sm:gap-8">
        <PageHeader
          title={leagueConfig.qitawrariHub.name}
          description={leagueConfig.qitawrariHub.tagline}
          showGameweekSelector={false}
          currentGameweek={0}
          selectedGameweek={0}
        />

        <ImageSlideshow />

        <blockquote className="border-l-2 border-accent pl-4 text-sm italic text-accent sm:text-base">
          &ldquo;{leagueConfig.qitawrariHub.quote}&rdquo;
        </blockquote>

        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm text-fg-2">
              <Timer className="h-4 w-4 text-fg-3" />
              FPL Cup
            </div>
            <div className="text-right text-sm font-medium">
              {cupCountdown.announced ? (
                cupCountdown.underway ? (
                  <span className="text-fg">Cup underway</span>
                ) : (
                  <span className="text-fg">{cupCountdown.days} days until kickoff</span>
                )
              ) : (
                <span className="text-fg-3">Dates not announced yet</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hall of Qitawrari</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <caption className="sr-only">Season records: champion and Qitawrari by season</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Season</TableHead>
                  <TableHead>Champion</TableHead>
                  <TableHead>Qitawrari</TableHead>
                  <TableHead className="hidden sm:table-cell">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leagueConfig.records.map((record) => (
                  <TableRow key={record.season}>
                    <TableCell className="font-medium text-fg">{record.season}</TableCell>
                    <TableCell>{record.champion ?? "–"}</TableCell>
                    <TableCell className="font-medium text-negative">{record.qitawrari ?? "–"}</TableCell>
                    <TableCell className="hidden text-fg-3 sm:table-cell">{record.note ?? "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
