import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Admin: permanently delete a subscriber record. Distinct from
 * unsubscribing — this removes the row entirely (e.g. spam sign-ups,
 * privacy/erasure requests).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const deleted = await db()
    .delete(subscribers)
    .where(eq(subscribers.id, id))
    .returning({ email: subscribers.email });
  const message =
    deleted.length > 0
      ? `Deleted ${deleted[0].email}`
      : "Subscriber not found";
  return NextResponse.redirect(
    new URL(
      `/admin?tab=subscribers&message=${encodeURIComponent(message)}`,
      request.url,
    ),
    { status: 303 },
  );
}
