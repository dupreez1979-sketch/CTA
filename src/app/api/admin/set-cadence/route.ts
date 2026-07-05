import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { SubscriberCadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CADENCES: SubscriberCadence[] = ["daily", "weekly", "fortnightly", "none"];

/**
 * Admin: change what a subscriber receives from the dashboard table —
 * their cadence (or Showcase only) and their Showcase Edition opt-in.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const cadence = String(form.get("cadence") ?? "") as SubscriberCadence;
  // Showcase-only always implies the Showcase opt-in.
  const showcase =
    cadence === "none" ? true : String(form.get("showcase") ?? "") === "1";
  if (!Number.isInteger(id) || !CADENCES.includes(cadence)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const updated = await db()
    .update(subscribers)
    .set({ cadence, showcase, updatedAt: new Date() })
    .where(eq(subscribers.id, id))
    .returning({ email: subscribers.email });
  const message =
    updated.length > 0
      ? `Changed ${updated[0].email} to ${cadence === "none" ? "Showcase only" : cadence}${cadence === "none" ? "" : showcase ? " plus The Showcase Edition" : ", no Showcase Edition"}`
      : "Subscriber not found";
  return NextResponse.redirect(
    new URL(`/admin?tab=subscribers&message=${encodeURIComponent(message)}`, canonicalBase(request.url)),
    { status: 303 },
  );
}
