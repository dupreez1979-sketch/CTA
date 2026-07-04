import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, shows } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Admin: manage the "What's happening" show registry that appears at the
 * bottom of The Showcase. Archived shows stay on file but leave the email.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(`/admin?tab=presenters&message=${encodeURIComponent(message)}`, request.url),
      { status: 303 },
    );

  if (action === "add") {
    const title = String(form.get("title") ?? "").trim();
    const companyKey = String(form.get("companyKey") ?? "").trim();
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    if (!title || !companyKey)
      return redirect("Please enter a show title and pick a company");
    const inserted = await db()
      .insert(shows)
      .values({
        companyKey,
        title,
        url: val("url"),
        blurb: val("blurb"),
        ageRange: val("ageRange"),
      })
      .onConflictDoNothing()
      .returning({ id: shows.id });
    return redirect(
      inserted.length > 0
        ? `Added ${title} to What's happening`
        : "That company already has a show with this title",
    );
  }

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return redirect("Invalid input");

  if (action === "update") {
    const title = String(form.get("title") ?? "").trim();
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    if (!title) return redirect("Please enter a show title");
    await db()
      .update(shows)
      .set({
        title,
        url: val("url"),
        blurb: val("blurb"),
        ageRange: val("ageRange"),
        updatedAt: new Date(),
      })
      .where(eq(shows.id, id));
    return redirect(`Updated ${title}`);
  }

  if (action === "archive" || action === "activate") {
    const status = action === "archive" ? "archived" : "active";
    const updated = await db()
      .update(shows)
      .set({ status, updatedAt: new Date() })
      .where(eq(shows.id, id))
      .returning({ title: shows.title });
    if (updated.length === 0) return redirect("Show not found");
    return redirect(
      status === "archived"
        ? `${updated[0].title} archived — it leaves the next Showcase`
        : `${updated[0].title} is back in What's happening`,
    );
  }

  if (action === "delete") {
    const deleted = await db()
      .delete(shows)
      .where(eq(shows.id, id))
      .returning({ title: shows.title });
    return redirect(
      deleted.length > 0 ? `Removed ${deleted[0].title}` : "Show not found",
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
