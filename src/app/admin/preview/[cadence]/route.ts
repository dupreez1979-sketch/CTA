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
  _request: NextRequest,
  { params }: { params: Promise<{ cadence: string }> },
) {
  const { cadence } = await params;
  if (!["daily", "weekly", "fortnightly"].includes(cadence)) {
    return new NextResponse(
      messagePageHtml(
        "No such preview",
        "Previews exist for the daily, weekly and fortnightly dispatches. Use the preview buttons on the Sending tab.",
        { backHref: "/admin?tab=sending", backLabel: "Back to Sending" },
      ),
      {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }
  const window = issueWindow(cadence as Cadence, new Date());
  const assembled = await assembleIssue(window);
  if (!assembled) {
    return new NextResponse(
      messagePageHtml(
        "Nothing in this window yet",
        `There are no posts in the ${cadence} window (${window.dateRange}), so there is no issue to preview. Click "Fetch new posts now" on the Sending tab, or check back once the companies have posted.`,
        { backHref: "/admin?tab=sending", backLabel: "Back to Sending" },
      ),
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  const html = await renderIssueHtml(
    assembled,
    "#unsubscribe-preview",
  );
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
