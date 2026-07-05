import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { SubscriberCadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CADENCES: SubscriberCadence[] = ["daily", "weekly", "fortnightly", "none"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin: add a subscriber directly from the dashboard. Upserts by email
 * like the public sign-up (re-adding someone updates their choices and
 * reactivates them), but does not trigger the new-subscriber
 * notification: the admin is the one adding them.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const cadence = String(form.get("cadence") ?? "") as SubscriberCadence;
  const showcase =
    cadence === "none" ? true : String(form.get("showcase") ?? "") === "1";

  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=subscribers&message=${encodeURIComponent(message)}`,
        canonicalBase(request.url),
      ),
      { status: 303 },
    );

  if (!firstName || !lastName) return redirect("First and last name are needed");
  if (!EMAIL_RE.test(email) || email.length > 254)
    return redirect("That email address does not look right");
  if (!CADENCES.includes(cadence)) return redirect("Pick what they receive");

  const existing = await db()
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  await db()
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
    });

  const what =
    cadence === "none"
      ? "The Showcase Edition only"
      : showcase
        ? `the ${cadence} newsletter plus The Showcase Edition`
        : `the ${cadence} newsletter`;
  return redirect(
    existing.length > 0
      ? `${email} was already subscribed; updated to ${what}`
      : `Added ${firstName} ${lastName} (${email}), receiving ${what}`,
  );
}
