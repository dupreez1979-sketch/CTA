import { NextRequest, NextResponse } from "next/server";
import { getLogs } from "@/lib/log";
import type { LogLevel } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Admin: read the activity log on demand (the Settings log panel fetches
 * this only when opened, so it never runs during a normal page load).
 * Behind admin basic auth via middleware.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const levelParam = sp.get("level");
  const level = (["error", "warning", "info"] as const).includes(
    levelParam as LogLevel,
  )
    ? (levelParam as LogLevel)
    : undefined;
  const limit = Number(sp.get("limit"));
  const rows = await getLogs({
    level,
    limit: Number.isInteger(limit) && limit > 0 ? limit : 200,
  });
  return NextResponse.json({ rows });
}
