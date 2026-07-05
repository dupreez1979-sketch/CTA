import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { eq } from "drizzle-orm";
import { db, feeds } from "@/lib/db";
import { loadFeeds } from "@/lib/feed-store";

export const dynamic = "force-dynamic";

/**
 * Admin: manage the RSS feed registry (Settings → RSS feeds).
 * Actions: add, update (name/url/mode/notes/active), delete.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  const back = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=settings&message=${encodeURIComponent(message)}`,
        canonicalBase(request.url),
      ),
      { status: 303 },
    );

  const name = String(form.get("name") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const modeRaw = String(form.get("mode") ?? "review");
  const mode = modeRaw === "automatic" ? "automatic" : "review";
  const notes = String(form.get("notes") ?? "").trim() || null;

  if (action === "add") {
    if (!name || !url) return back("A feed needs a name and a URL");
    if (!/^https?:\/\//i.test(url)) {
      return back("The feed URL must start with http:// or https://");
    }
    // Seeds the defaults first so a brand-new deployment can't lose them.
    await loadFeeds();
    const inserted = await db()
      .insert(feeds)
      .values({ name, url, mode, notes })
      .onConflictDoNothing()
      .returning({ id: feeds.id });
    return back(
      inserted.length === 0
        ? "That feed URL is already in the list"
        : `Added the "${name}" feed (${mode === "review" ? "manual review" : "automatic"})`,
    );
  }

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return back("Missing feed id");

  if (action === "update") {
    if (!name || !url) return back("A feed needs a name and a URL");
    if (!/^https?:\/\//i.test(url)) {
      return back("The feed URL must start with http:// or https://");
    }
    // An unticked checkbox is absent from the form data entirely.
    const active = form.get("active") != null;
    await db()
      .update(feeds)
      .set({ name, url, mode, notes, active })
      .where(eq(feeds.id, id));
    return back(
      `Saved the "${name}" feed${active ? "" : " (paused)"}`,
    );
  }

  if (action === "delete") {
    const [gone] = await db()
      .delete(feeds)
      .where(eq(feeds.id, id))
      .returning({ name: feeds.name });
    return back(
      gone
        ? `Deleted the "${gone.name}" feed. Stories already ingested stay.`
        : "That feed was already deleted",
    );
  }

  return back("Unknown action");
}
