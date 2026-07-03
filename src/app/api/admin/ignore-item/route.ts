import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, feedItems } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Admin: dismiss a post from the unfiled-posts triage panel. The post
 * keeps appearing under "Around the Alliance" in issues — this only
 * marks it as looked-at so the panel stays a to-do list.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await db()
    .update(feedItems)
    .set({ reviewed: true })
    .where(eq(feedItems.id, id));
  return NextResponse.redirect(
    new URL(
      `/admin?tab=companies&message=${encodeURIComponent("Post dismissed from the unfiled list")}`,
      request.url,
    ),
    { status: 303 },
  );
}
