import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { eq } from "drizzle-orm";
import { db, companies } from "@/lib/db";
import { loadCompanies, slugify } from "@/lib/company-store";

export const dynamic = "force-dynamic";

/**
 * Admin: manage the registry of Alliance companies (add / update / delete).
 * `match` is a comma-separated list of lowercase fragments checked
 * against each feed post's page name, title and link.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const inclusionMode: "auto" | "manual" =
    String(form.get("inclusionMode") ?? "") === "manual" ? "manual" : "auto";
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(`/admin?tab=settings&message=${encodeURIComponent(message)}`, canonicalBase(request.url)),
      { status: 303 },
    );

  if (action === "add") {
    const name = String(form.get("name") ?? "").trim();
    const match = String(form.get("match") ?? "").trim();
    const showsPageUrl = String(form.get("showsPageUrl") ?? "").trim();
    const showsPageUrl2 = String(form.get("showsPageUrl2") ?? "").trim();
    if (!name) return redirect("Please enter a company name");
    // Ensure the table is seeded before the first manual add
    await loadCompanies();
    const key = slugify(name);
    if (!key) return redirect("Please enter a valid company name");
    const inserted = await db()
      .insert(companies)
      .values({
        key,
        name,
        match: match || name.toLowerCase(),
        showsPageUrl: showsPageUrl || null,
        showsPageUrl2: showsPageUrl2 || null,
        inclusionMode,
      })
      .onConflictDoNothing()
      .returning({ id: companies.id });
    return redirect(
      inserted.length > 0
        ? `Added ${name}`
        : `A company with a similar name already exists (${key})`,
    );
  }

  if (action === "update") {
    const id = Number(form.get("id"));
    const name = String(form.get("name") ?? "").trim();
    const match = String(form.get("match") ?? "").trim();
    const showsPageUrl = String(form.get("showsPageUrl") ?? "").trim();
    const showsPageUrl2 = String(form.get("showsPageUrl2") ?? "").trim();
    if (!Number.isInteger(id) || !name) return redirect("Invalid input");
    await db()
      .update(companies)
      .set({
        name,
        match: match || name.toLowerCase(),
        showsPageUrl: showsPageUrl || null,
        showsPageUrl2: showsPageUrl2 || null,
        inclusionMode,
      })
      .where(eq(companies.id, id));
    return redirect(`Updated ${name}`);
  }

  if (action === "delete") {
    const id = Number(form.get("id"));
    if (!Number.isInteger(id)) return redirect("Invalid input");
    const deleted = await db()
      .delete(companies)
      .where(eq(companies.id, id))
      .returning({ name: companies.name });
    return redirect(
      deleted.length > 0 ? `Removed ${deleted[0].name}` : "Company not found",
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
