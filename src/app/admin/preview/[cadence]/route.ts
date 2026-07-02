import { NextRequest, NextResponse } from "next/server";
import { issueWindow } from "@/lib/cadence";
import { assembleIssue, renderIssueHtml } from "@/lib/send";
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
    return NextResponse.json({ error: "Unknown cadence" }, { status: 404 });
  }
  const window = issueWindow(cadence as Cadence, new Date());
  const assembled = await assembleIssue(window);
  if (!assembled) {
    return new NextResponse(
      `<body style="font-family:sans-serif;padding:40px">No feed items in the ${cadence} window (${window.dateRange}). Run the pipeline first.</body>`,
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
