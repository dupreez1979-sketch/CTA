import { NextRequest, NextResponse } from "next/server";
import { assembleEdition, getEdition, renderShowcaseHtml } from "@/lib/presenter";
import { messagePageHtml } from "@/lib/message-page";

export const dynamic = "force-dynamic";

function page(title: string, body: string) {
  return new NextResponse(
    messagePageHtml(title, body, {
      backHref: "/admin?tab=presenters",
      backLabel: "Back to The Showcase",
    }),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/**
 * Live preview of a Showcase edition (draft or sent), rendered from its
 * stored story and show selection. Behind admin basic auth (middleware).
 */
export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("edition"));
  if (!Number.isInteger(id) || id <= 0) {
    return page(
      "Nothing to preview yet",
      "Pick a Showcase to preview from The Showcase tab: this page needs to know which edition to show.",
    );
  }
  const edition = await getEdition(id);
  if (!edition)
    return page(
      "That Showcase is gone",
      "This edition no longer exists. It may have been deleted. Head back to The Showcase tab to pick another one.",
    );
  const assembled = await assembleEdition(id);
  if (!assembled) {
    return page(
      "This Showcase is empty",
      "There is nothing in this edition yet. Add stories or spotlight shows in the builder, then preview again.",
    );
  }
  let html = await renderShowcaseHtml(assembled);
  // The Spotlight grid needs an even card count; sending is blocked while
  // it's odd, so flag it loudly in the preview too.
  const spotlightCount = assembled.props.shows.length;
  if (spotlightCount % 2 === 1) {
    const warning = `<div style="position:sticky;top:0;z-index:9;background:#F24A71;color:#fff;font-family:sans-serif;font-weight:700;font-size:14px;padding:12px 18px;text-align:center">Preview only: ${spotlightCount} show${spotlightCount === 1 ? "" : "s"} in the Spotlight. The grid needs an even number before this Showcase can be sent.</div>`;
    html = html.replace(/<body([^>]*)>/i, `<body$1>${warning}`);
  }
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
