import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CADENCES: Cadence[] = ["daily", "weekly", "fortnightly"];

/** Admin: change a subscriber's cadence from the dashboard table. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const cadence = String(form.get("cadence") ?? "") as Cadence;
  if (!Number.isInteger(id) || !CADENCES.includes(cadence)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const updated = await db()
    .update(subscribers)
    .set({ cadence, updatedAt: new Date() })
    .where(eq(subscribers.id, id))
    .returning({ email: subscribers.email });
  const message =
    updated.length > 0
      ? `Changed ${updated[0].email} to ${cadence}`
      : "Subscriber not found";
  return NextResponse.redirect(
    new URL(`/admin?message=${encodeURIComponent(message)}`, request.url),
    { status: 303 },
  );
}
