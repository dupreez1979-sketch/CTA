import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { eq, sql } from "drizzle-orm";
import { db, shows } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Admin: manage the show registry on the Shows tab (it renders as "Shows
 * in the Spotlight" in The Showcase). Archived shows stay on file but
 * leave the email. Adding refuses duplicates: same company, same title
 * (ignoring case).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const anchor = String(form.get("anchor") ?? "");
  const hash = /^[a-z][a-z0-9-]*$/.test(anchor) ? `#${anchor}` : "";
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=shows&message=${encodeURIComponent(message)}${hash}`,
        canonicalBase(request.url),
      ),
      { status: 303 },
    );

  if (action === "add") {
    const title = String(form.get("title") ?? "").trim();
    const companyKey = String(form.get("companyKey") ?? "").trim();
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    if (!title || !companyKey)
      return redirect("Please enter a show title and pick a company");
    const [duplicate] = await db()
      .select({ id: shows.id, title: shows.title })
      .from(shows)
      .where(
        sql`${shows.companyKey} = ${companyKey} and lower(${shows.title}) = ${title.toLowerCase()}`,
      )
      .limit(1);
    if (duplicate) {
      return redirect(
        `That company already has "${duplicate.title}" in the list`,
      );
    }
    const inserted = await db()
      .insert(shows)
      .values({
        companyKey,
        title,
        url: val("url"),
        blurb: val("blurb"),
        ageRange: val("ageRange"),
        imageUrl: val("imageUrl"),
      })
      .onConflictDoNothing()
      .returning({ id: shows.id });
    return redirect(
      inserted.length > 0
        ? `Added ${title} to the show list`
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
        imageUrl: val("imageUrl"),
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
        ? `${updated[0].title} archived, it leaves new Showcases`
        : `${updated[0].title} is back in Shows in the Spotlight`,
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
