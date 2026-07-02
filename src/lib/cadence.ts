import type { Cadence } from "./db/schema";

/**
 * Cadence scheduling and date-window logic. All calendar decisions
 * (which weekday it is, date-range labels, fortnight parity) are made in
 * Australia/Sydney time; windows themselves are exact instants ending at
 * the send moment. Pure functions of `now` for testability.
 */

export const TIMEZONE = "Australia/Sydney";

const HOURS: Record<Cadence, number> = {
  daily: 24,
  weekly: 24 * 7,
  fortnightly: 24 * 14,
};

export const INTRO: Record<Cadence, string> = {
  daily: "Today across the Alliance",
  weekly: "This week across the Alliance",
  fortnightly: "This fortnight across the Alliance",
};

/** Y/M/D + weekday of an instant, in Sydney time. */
export function sydneyParts(date: Date): {
  year: number;
  month: number;
  day: number;
  weekday: string;
} {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "long",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
  };
}

function sydneyDateKey(date: Date): string {
  const { year, month, day } = sydneyParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatSydney(date: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: TIMEZONE, ...opts }).format(
    date,
  );
}

export interface IssueWindow {
  cadence: Cadence;
  start: Date;
  end: Date;
  /** Idempotency key, e.g. "2026-07-01" or "2026-06-29_2026-07-05". */
  key: string;
  /** Masthead label, e.g. "Wednesday 1 July 2026" or "29 Jun – 5 Jul 2026". */
  dateRange: string;
  intro: string;
}

/**
 * The issue window for a cadence, ending at `now`.
 * Labels follow the handoff samples: daily shows the send day in full
 * ("Wednesday 1 July 2026"); weekly/fortnightly show the covered span
 * ending yesterday ("29 Jun – 5 Jul 2026").
 */
export function issueWindow(cadence: Cadence, now: Date): IssueWindow {
  const end = now;
  const start = new Date(end.getTime() - HOURS[cadence] * 3600_000);
  if (cadence === "daily") {
    return {
      cadence,
      start,
      end,
      key: sydneyDateKey(end),
      dateRange: formatSydney(end, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      intro: INTRO.daily,
    };
  }
  const labelEnd = new Date(end.getTime() - 24 * 3600_000);
  const startLabel = formatSydney(start, { day: "numeric", month: "short" });
  const endLabel = formatSydney(labelEnd, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return {
    cadence,
    start,
    end,
    key: `${sydneyDateKey(start)}_${sydneyDateKey(labelEnd)}`,
    dateRange: `${startLabel} – ${endLabel}`,
    intro: INTRO[cadence],
  };
}

/** Weekly issues go out on Sydney Mondays. */
export function isWeeklySendDay(now: Date): boolean {
  return sydneyParts(now).weekday === "Monday";
}

/**
 * Fortnightly issues go out on alternate Sydney Mondays, with parity fixed
 * by an anchor date (a known send Monday, e.g. FORTNIGHT_ANCHOR=2026-07-06).
 */
export function isFortnightlySendDay(now: Date, anchor: string): boolean {
  if (!isWeeklySendDay(now)) return false;
  const anchorDate = new Date(`${anchor}T00:00:00Z`);
  if (isNaN(anchorDate.getTime())) {
    throw new Error(`Invalid FORTNIGHT_ANCHOR date: ${anchor}`);
  }
  const todayKey = sydneyDateKey(now);
  const todayDate = new Date(`${todayKey}T00:00:00Z`);
  const days = Math.round(
    (todayDate.getTime() - anchorDate.getTime()) / (24 * 3600_000),
  );
  return ((days / 7) % 2 + 2) % 2 === 0;
}

/** Which cadences should send at this moment. Daily always sends. */
export function cadencesDueNow(now: Date, fortnightAnchor: string): Cadence[] {
  const due: Cadence[] = ["daily"];
  if (isWeeklySendDay(now)) due.push("weekly");
  if (isFortnightlySendDay(now, fortnightAnchor)) due.push("fortnightly");
  return due;
}
