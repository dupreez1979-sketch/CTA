import { NextRequest, NextResponse } from "next/server";
import { issueWindow } from "@/lib/cadence";
import { assembleIssue, renderIssueHtml } from "@/lib/send";
import { messagePageHtml } from "@/lib/message-page";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Live preview of the next issue for a cadence, rendered from the items
 * currently in the database. Behind admin basic auth (middleware).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cadence: string }> },
) {
  const { cadence } = await params;
  if (!["daily", "weekly", "fortnightly"].includes(cadence)) {
    return new NextResponse(
      messagePageHtml(
        "No such preview",
        "Previews exist for the daily, weekly and fortnightly dispatches. Use the preview buttons on the Editions tab.",
        { backHref: "/admin?tab=editions", backLabel: "Back to Editions" },
      ),
      {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }
  const window = issueWindow(cadence as Cadence, new Date());
  try {
    // Render the preview against whatever origin the admin is viewing it on,
    // so it works even if APP_URL is unset or stale after a domain change.
    const assembled = await assembleIssue(window, new URL(request.url).origin);
    if (!assembled) {
      return new NextResponse(
        messagePageHtml(
          "Nothing in this window yet",
          `There are no posts in the ${cadence} window (${window.dateRange}), so there is no issue to preview. Click "Fetch new posts now" on the Editions tab, or check back once the companies have posted.`,
          { backHref: "/admin?tab=editions", backLabel: "Back to Editions" },
        ),
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
    const html = await renderIssueHtml(assembled, "#unsubscribe-preview");
    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    // Behind admin auth: surface the real error so it can be diagnosed
    // instead of a blank browser 500.
    const detail =
      err instanceof Error
        ? `${err.message}${err.cause ? `\n\nCause: ${String((err.cause as Error)?.message ?? err.cause)}` : ""}\n\n${err.stack ?? ""}`
        : String(err);
    console.error(`Preview (${cadence}) failed:`, err);
    return new NextResponse(
      messagePageHtml(
        "Preview could not be built",
        `Something went wrong assembling the ${cadence} preview. The technical detail below helps diagnose it:\n\n${detail}`,
        { backHref: "/admin?tab=editions", backLabel: "Back to Editions" },
      ),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}
