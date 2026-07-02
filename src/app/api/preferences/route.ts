import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CADENCES: Cadence[] = ["daily", "weekly", "fortnightly"];

/**
 * Save a subscriber's cadence choice (from /preferences). Choosing a
 * frequency also reactivates an unsubscribed address — picking how often
 * to hear from us is an explicit opt back in.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const cadence = String(form.get("cadence") ?? "") as Cadence;

  if (!token || !CADENCES.includes(cadence)) {
    return NextResponse.redirect(new URL("/preferences", request.url), {
      status: 303,
    });
  }

  await db()
    .update(subscribers)
    .set({ cadence, status: "active", updatedAt: new Date() })
    .where(eq(subscribers.unsubscribeToken, token));

  return NextResponse.redirect(
    new URL(
      `/preferences?token=${encodeURIComponent(token)}&saved=1`,
      request.url,
    ),
    { status: 303 },
  );
}
