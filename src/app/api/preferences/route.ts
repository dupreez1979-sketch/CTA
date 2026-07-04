import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { SubscriberCadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CADENCES: SubscriberCadence[] = ["daily", "weekly", "fortnightly", "none"];

/**
 * Save a subscriber's cadence and Showcase choices (from /preferences).
 * Saving also reactivates an unsubscribed address — picking what to hear
 * from us is an explicit opt back in. "Showcase only" (cadence "none")
 * always implies the Showcase opt-in, whatever the checkbox said.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const cadence = String(form.get("cadence") ?? "") as SubscriberCadence;
  const showcase = cadence === "none" ? true : form.get("showcase") === "1";

  if (!token || !CADENCES.includes(cadence)) {
    return NextResponse.redirect(new URL("/preferences", request.url), {
      status: 303,
    });
  }

  await db()
    .update(subscribers)
    .set({ cadence, showcase, status: "active", updatedAt: new Date() })
    .where(eq(subscribers.unsubscribeToken, token));

  return NextResponse.redirect(
    new URL(
      `/preferences?token=${encodeURIComponent(token)}&saved=1`,
      request.url,
    ),
    { status: 303 },
  );
}
