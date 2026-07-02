import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CADENCES: Cadence[] = ["daily", "weekly", "fortnightly"];
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
  const cadence = String(body.cadence ?? "").toLowerCase() as Cadence;

  if (!firstName || firstName.length > 100)
    return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  if (!lastName || lastName.length > 100)
    return NextResponse.json({ error: "Please enter your last name." }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 254)
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!CADENCES.includes(cadence))
    return NextResponse.json({ error: "Please choose how often." }, { status: 400 });

  await db()
    .insert(subscribers)
    .values({
      firstName,
      lastName,
      email,
      cadence,
      status: "active",
      unsubscribeToken: randomBytes(24).toString("base64url"),
    })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: {
        firstName,
        lastName,
        cadence,
        status: "active",
        updatedAt: sql`now()`,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
