import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, allianceUpdates } from "@/lib/db";
import { renderAllianceUpdate } from "@/lib/alliance";
import { ensureAllianceSchema } from "@/lib/db-errors";
import { messagePageHtml } from "@/lib/message-page";

export const dynamic = "force-dynamic";

function page(title: string, body: string) {
  return new NextResponse(
    messagePageHtml(title, body, {
      backHref: "/admin?tab=settings#alliance",
      backLabel: "Back to Settings",
    }),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/**
 * Live preview of an Alliance update (draft or sent), rendered from its
 * stored subject and content. Behind admin basic auth (middleware).
 */
export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("update"));
  if (!Number.isInteger(id) || id <= 0) {
    return page(
      "Nothing to preview yet",
      "Pick an Alliance update to preview from the Settings tab: this page needs to know which one to show.",
    );
  }
  await ensureAllianceSchema();
  const rows = await db()
    .select()
    .from(allianceUpdates)
    .where(eq(allianceUpdates.id, id))
    .limit(1);
  const update = rows[0];
  if (!update)
    return page(
      "That update is gone",
      "This Alliance update no longer exists. It may have been deleted. Head back to Settings to pick another one.",
    );
  const html = await renderAllianceUpdate(update);
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
