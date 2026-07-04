import { NextRequest, NextResponse } from "next/server";
import { assembleEdition, getEdition, renderShowcaseHtml } from "@/lib/presenter";

export const dynamic = "force-dynamic";

function page(body: string) {
  return new NextResponse(
    `<body style="font-family:sans-serif;padding:40px">${body}</body>`,
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
      "Pick a Showcase to preview from the admin tab (this page needs ?edition=…).",
    );
  }
  const edition = await getEdition(id);
  if (!edition) return page("That Showcase no longer exists.");
  const assembled = await assembleEdition(id);
  if (!assembled) {
    return page(
      "This Showcase is empty. Add stories or happenings in the builder first.",
    );
  }
  const html = await renderShowcaseHtml(assembled);
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
