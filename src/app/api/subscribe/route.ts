import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { SubscriberCadence } from "@/lib/db/schema";
import { notifyNewSubscriber } from "@/lib/notify";
import { logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

// "daily" is no longer offered to new sign-ups (existing daily subscribers
// keep it; see the preferences page). New self-serve subscriptions may only
// choose weekly, fortnightly, or Showcase-only.
const CADENCES: SubscriberCadence[] = ["weekly", "fortnightly", "none"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Instant subscribe (no double opt-in, per product decision). Upserts by
 * email so re-subscribing or changing cadence just updates the row and
 * reactivates an unsubscribed address.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cadence = String(body.cadence ?? "").toLowerCase() as SubscriberCadence;
  // Absent means true: older embedded sign-up forms don't send the field,
  // and The Showcase Edition is opt-out. "Showcase only" implies opted in.
  const showcase = cadence === "none" ? true : body.showcase !== false;

  if (!firstName || firstName.length > 100)
    return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  if (!lastName || lastName.length > 100)
    return NextResponse.json({ error: "Please enter your last name." }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 254)
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!CADENCES.includes(cadence))
    return NextResponse.json({ error: "Please choose how often." }, { status: 400 });

  // Check for an existing row first so the team is only notified about
  // genuinely new subscribers, not cadence changes or re-subscribes.
  const existing = await db()
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  const [row] = await db()
    .insert(subscribers)
    .values({
      firstName,
      lastName,
      email,
      cadence,
      showcase,
      status: "active",
      unsubscribeToken: randomBytes(24).toString("base64url"),
    })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: {
        firstName,
        lastName,
        cadence,
        showcase,
        status: "active",
        updatedAt: sql`now()`,
      },
    })
    .returning();

  if (existing.length === 0 && row) {
    // Never throws — a notification problem must not break the sign-up.
    await notifyNewSubscriber(row);
    await logInfo("subscriber", `New subscriber: ${email} (${cadence})`);
  } else if (row) {
    await logInfo(
      "subscriber",
      `Subscriber re-submitted the sign-up form: ${email} (${cadence})`,
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
