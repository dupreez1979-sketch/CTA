import { NextRequest, NextResponse } from "next/server";
import { issueWindow } from "@/lib/cadence";
import { sendTest } from "@/lib/send";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Admin: send the current issue for a cadence to a single test address. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const cadence = String(form.get("cadence") ?? "");
  const to = String(form.get("to") ?? "").trim();
  if (!["daily", "weekly", "fortnightly"].includes(cadence) || !to.includes("@")) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const result = await sendTest(issueWindow(cadence as Cadence, new Date()), to);
    return NextResponse.redirect(
      new URL(`/admin?message=${encodeURIComponent(result === "sent" ? `Test ${cadence} issue sent to ${to}` : `No items in the ${cadence} window — nothing to send`)}`, request.url),
      { status: 303 },
    );
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin?message=${encodeURIComponent(`Send failed: ${err}`)}`, request.url),
      { status: 303 },
    );
  }
}
