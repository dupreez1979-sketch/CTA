import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { issueWindow } from "@/lib/cadence";
import { sendIssue } from "@/lib/send";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Admin: manually send the current issue for a cadence to all its active
 * subscribers. Uses the same idempotent path as the cron — if this
 * window's issue already went out, nothing is re-sent.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const cadence = String(form.get("cadence") ?? "");
  if (!["daily", "weekly", "fortnightly"].includes(cadence)) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }
  try {
    const result = await sendIssue(issueWindow(cadence as Cadence, new Date()));
    const message =
      result.status === "sent"
        ? `Sent ${cadence} issue (${result.itemCount} items) to ${result.recipientCount} subscribers`
        : result.status === "already-sent"
          ? `This ${cadence} window's issue was already sent`
          : `Skipped — no items or no subscribers for ${cadence}`;
    return NextResponse.redirect(
      new URL(`/admin?tab=editions&message=${encodeURIComponent(message)}`, canonicalBase(request.url)),
      { status: 303 },
    );
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin?tab=editions&message=${encodeURIComponent(`Send failed: ${err}`)}`, canonicalBase(request.url)),
      { status: 303 },
    );
  }
}
