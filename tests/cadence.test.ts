import { describe, expect, it } from "vitest";
import {
  cadencesDueNow,
  formatSydneyDateTime,
  isFortnightlySendDay,
  isWeeklySendDay,
  issueWindow,
  nextSendAt,
} from "@/lib/cadence";

// 21:00 UTC = 07:00 next day in Sydney (AEST, UTC+10)
const MONDAY_7AM_SYD = new Date("2026-07-05T21:00:00Z"); // Mon 6 Jul 07:00 Sydney
const WEDNESDAY_7AM_SYD = new Date("2026-06-30T21:00:00Z"); // Wed 1 Jul 07:00 Sydney

describe("issueWindow", () => {
  it("daily window is 24h and labelled with the Sydney send day", () => {
    const w = issueWindow("daily", WEDNESDAY_7AM_SYD);
    expect(w.end.getTime() - w.start.getTime()).toBe(24 * 3600_000);
    expect(w.key).toBe("2026-07-01");
    expect(w.dateRange).toContain("Wednesday");
    expect(w.dateRange).toContain("1 July 2026");
    expect(w.intro).toBe("Today across the Alliance");
  });

  it("weekly window covers the prior 7 days ending yesterday", () => {
    const w = issueWindow("weekly", MONDAY_7AM_SYD);
    expect(w.end.getTime() - w.start.getTime()).toBe(7 * 24 * 3600_000);
    expect(w.key).toBe("2026-06-29_2026-07-05");
    expect(w.dateRange).toMatch(/29 Jun\w* – 5 Jul\w* 2026/);
    expect(w.intro).toBe("This week across the Alliance");
  });

  it("fortnightly window covers 14 days", () => {
    const w = issueWindow("fortnightly", MONDAY_7AM_SYD);
    expect(w.end.getTime() - w.start.getTime()).toBe(14 * 24 * 3600_000);
    expect(w.key).toBe("2026-06-22_2026-07-05");
    expect(w.intro).toBe("This fortnight across the Alliance");
  });
});

describe("send days", () => {
  it("weekly sends only on Sydney Mondays", () => {
    expect(isWeeklySendDay(MONDAY_7AM_SYD)).toBe(true);
    expect(isWeeklySendDay(WEDNESDAY_7AM_SYD)).toBe(false);
  });

  it("Sunday 21:00 UTC is already Monday in Sydney", () => {
    expect(isWeeklySendDay(new Date("2026-07-05T21:00:00Z"))).toBe(true);
    // Same instant is Sunday in UTC
    expect(new Date("2026-07-05T21:00:00Z").getUTCDay()).toBe(0);
  });

  it("fortnightly parity follows the anchor Monday", () => {
    // Anchor Monday 6 Jul 2026 → sends that day
    expect(isFortnightlySendDay(MONDAY_7AM_SYD, "2026-07-06")).toBe(true);
    // The following Monday (13 Jul) → off week
    const nextMonday = new Date("2026-07-12T21:00:00Z");
    expect(isFortnightlySendDay(nextMonday, "2026-07-06")).toBe(false);
    // Two weeks after the anchor → on again
    const mondayAfter = new Date("2026-07-19T21:00:00Z");
    expect(isFortnightlySendDay(mondayAfter, "2026-07-06")).toBe(true);
    // Works with an anchor in the future too
    expect(isFortnightlySendDay(MONDAY_7AM_SYD, "2026-07-20")).toBe(true);
  });

  it("cadencesDueNow combines the three cadences", () => {
    expect(cadencesDueNow(WEDNESDAY_7AM_SYD, "2026-07-06")).toEqual(["daily"]);
    expect(cadencesDueNow(MONDAY_7AM_SYD, "2026-07-06")).toEqual([
      "daily",
      "weekly",
      "fortnightly",
    ]);
    expect(cadencesDueNow(new Date("2026-07-12T21:00:00Z"), "2026-07-06")).toEqual([
      "daily",
      "weekly",
    ]);
  });

  it("rejects an invalid anchor", () => {
    expect(() => isFortnightlySendDay(MONDAY_7AM_SYD, "not-a-date")).toThrow();
  });
});

describe("nextSendAt", () => {
  // Wednesday 1 Jul 2026 10:00 Sydney = 00:00 UTC
  const WED_MORNING = new Date("2026-07-01T00:00:00Z");

  it("daily is the next 21:00 UTC firing", () => {
    expect(nextSendAt("daily", WED_MORNING, "2026-07-06").toISOString()).toBe(
      "2026-07-01T21:00:00.000Z",
    );
    // Just after a firing → tomorrow's
    const after = new Date("2026-07-01T21:30:00Z");
    expect(nextSendAt("daily", after, "2026-07-06").toISOString()).toBe(
      "2026-07-02T21:00:00.000Z",
    );
  });

  it("weekly is the next firing that lands on a Sydney Monday", () => {
    // 2026-07-05T21:00Z is Monday 6 Jul, 7am in Sydney
    expect(nextSendAt("weekly", WED_MORNING, "2026-07-06").toISOString()).toBe(
      "2026-07-05T21:00:00.000Z",
    );
  });

  it("fortnightly respects the anchor parity", () => {
    // Anchor Monday 6 Jul → next fortnightly is that Monday's firing
    expect(
      nextSendAt("fortnightly", WED_MORNING, "2026-07-06").toISOString(),
    ).toBe("2026-07-05T21:00:00.000Z");
    // Just after it → skips the off-week Monday (13 Jul) to 20 Jul's firing
    const after = new Date("2026-07-05T21:30:00Z");
    expect(
      nextSendAt("fortnightly", after, "2026-07-06").toISOString(),
    ).toBe("2026-07-19T21:00:00.000Z");
  });

  it("formats the send instant in Sydney time", () => {
    const s = formatSydneyDateTime(new Date("2026-07-05T21:00:00Z"));
    expect(s).toContain("Mon");
    expect(s).toContain("6 Jul");
    expect(s.toLowerCase()).toContain("7:00");
  });
});
