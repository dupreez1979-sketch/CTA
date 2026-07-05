import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { and, inArray, ne } from "drizzle-orm";
import { db, feedItems } from "@/lib/db";
import { loadCompanies } from "@/lib/company-store";
import { FALLBACK_COMPANY_KEY } from "@/lib/companies";

export const dynamic = "force-dynamic";

/**
 * Admin: decide on stories in the review queue (single row or bulk).
 * op = approve | reject | unsure. Approved stories become available in
 * the Showcase builder's story pool (manual adding only, never the cadence
 * newsletters); rejected rows are kept so the guid dedup stops the
 * article resurfacing. Trusted "auto" rows are never touched.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const op = String(form.get("op") ?? "");
  const ids = form
    .getAll("ids")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  // Send the admin back to the queue with the same filters applied.
  const params = new URLSearchParams({ tab: "review" });
  for (const key of ["rst", "rcf", "rco", "rq", "rpg"]) {
    const v = form.get(key);
    if (typeof v === "string" && v) params.set(key, v);
  }
  const back = (message: string) => {
    params.set("message", message);
    return NextResponse.redirect(new URL(`/admin?${params}`, canonicalBase(request.url)), {
      status: 303,
    });
  };

  const status =
    op === "approve"
      ? ("approved" as const)
      : op === "reject"
        ? ("rejected" as const)
        : op === "unsure"
          ? ("unsure" as const)
          : null;
  if (!status) return back("Unknown action");
  if (ids.length === 0) return back("No stories selected");

  // A single-row decision may override the matched company.
  const companyRaw = String(form.get("company") ?? "").trim();
  let companyKey: string | null = null;
  if (companyRaw && ids.length === 1) {
    const companies = await loadCompanies();
    const valid = new Set([
      ...companies.map((c) => c.key),
      FALLBACK_COMPANY_KEY,
    ]);
    if (valid.has(companyRaw)) companyKey = companyRaw;
  }

  const updated = await db()
    .update(feedItems)
    .set({
      reviewStatus: status,
      reviewedAt: new Date(),
      reviewedBy: "admin",
      ...(companyKey ? { companyKey } : {}),
    })
    .where(
      and(inArray(feedItems.id, ids), ne(feedItems.reviewStatus, "auto")),
    )
    .returning({ id: feedItems.id });

  const n = updated.length;
  const noun = `stor${n === 1 ? "y" : "ies"}`;
  const message =
    status === "approved"
      ? `Approved ${n} ${noun}. They are now available to add to Showcase editions.`
      : status === "rejected"
        ? `Rejected ${n} ${noun}. They stay out of everything.`
        : `Marked ${n} ${noun} as unsure.`;
  return back(message);
}
