/**
 * Times shown to the league are in East Africa Time with a 12-hour clock,
 * e.g. "Fri 8:30 PM". Built from `Intl` parts so the output is the same on
 * every runtime rather than depending on a locale's own punctuation.
 */

export const EAT_TIME_ZONE = "Africa/Nairobi";

function parts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: EAT_TIME_ZONE, hour12: true, ...options });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

/** "Fri 8:30 PM" */
export function formatEat(date: Date): string {
  const p = parts(date, { weekday: "short", hour: "numeric", minute: "2-digit" });
  return `${p.weekday} ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "Fri 4 Sep, 8:30 PM" */
export function formatEatDate(date: Date): string {
  const p = parts(date, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/**
 * A coarse "time left" string: "3d 4h", "1h 05m", "25m", or "less than a
 * minute". Never negative — callers decide what a past time means.
 */
export function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(Math.max(ms, 0) / 60_000);
  if (totalMinutes < 1) return "less than a minute";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}
