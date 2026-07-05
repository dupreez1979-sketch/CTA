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

/**
 * The pipeline fires once a day at this UTC hour — keep in sync with the
 * cron expression in netlify/functions/daily-pipeline.mts ("0 21 * * *").
 * 21:00 UTC is 7am Sydney during AEST and 8am during AEDT.
 */
export const SEND_HOUR_UTC = 21;

export const SCHEDULE_DESCRIPTION: Record<Cadence, string> = {
  daily: "Every morning",
  weekly: "Every Monday morning",
  fortnightly: "Every second Monday morning",
};

/** The first pipeline firing strictly after `now`. */
function nextPipelineRun(now: Date): Date {
  const run = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      SEND_HOUR_UTC,
    ),
  );
  if (run.getTime() <= now.getTime()) {
    run.setUTCDate(run.getUTCDate() + 1);
  }
  return run;
}

/** The instant the next issue of a cadence goes out. */
export function nextSendAt(
  cadence: Cadence,
  now: Date,
  fortnightAnchor: string,
): Date {
  let run = nextPipelineRun(now);
  for (let i = 0; i < 21; i++) {
    if (
      cadence === "daily" ||
      (cadence === "weekly" && isWeeklySendDay(run)) ||
      (cadence === "fortnightly" && isFortnightlySendDay(run, fortnightAnchor))
    ) {
      return run;
    }
    run = new Date(run.getTime() + 24 * 3600_000);
  }
  throw new Error("Could not find a next send day within 21 days");
}

/**
 * Compact Sydney date + time for tables, e.g. "2026-07-05 07:00 AEST".
 * Keeps the Australian yyyy-mm-dd date style and adds the local send time
 * with its zone abbreviation (AEST/AEDT).
 */
export function formatSydneyStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")} ${get("timeZoneName")}`;
}

/** e.g. "Fri, 3 July 2026, 7:00 am AEST". */
export function formatSydneyDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

const WINDOW_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WINDOW_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseYmd(s: string): { y: number; m: number; d: number; dow: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = +match[1];
  const m = +match[2];
  const d = +match[3];
  // Window keys are plain calendar dates; use a UTC date purely to read the
  // weekday, avoiding any timezone drift.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

/**
 * Friendly label for an issue's window key with the weekday, for the history
 * tables. A daily key ("2026-07-06") keeps its Australian yyyy-mm-dd date and
 * gains a weekday ("Mon, 2026-07-06"). A weekly/fortnightly range
 * ("2026-06-29_2026-07-05") becomes "Mon 29 Jun to Sun 5 Jul 2026", collapsing
 * the month/year when both ends share them ("Wed 1 to Tue 7 Jul 2026").
 */
export function formatWindowLabel(key: string): string {
  if (key.includes("_")) {
    const [s, e] = key.split("_");
    const a = parseYmd(s);
    const b = parseYmd(e);
    if (!a || !b) return key;
    const start =
      a.y === b.y && a.m === b.m
        ? `${WINDOW_DOW[a.dow]} ${a.d}`
        : a.y === b.y
          ? `${WINDOW_DOW[a.dow]} ${a.d} ${WINDOW_MONTHS[a.m - 1]}`
          : `${WINDOW_DOW[a.dow]} ${a.d} ${WINDOW_MONTHS[a.m - 1]} ${a.y}`;
    const end = `${WINDOW_DOW[b.dow]} ${b.d} ${WINDOW_MONTHS[b.m - 1]} ${b.y}`;
    return `${start} to ${end}`;
  }
  const p = parseYmd(key);
  return p ? `${WINDOW_DOW[p.dow]}, ${key}` : key;
}
