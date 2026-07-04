import { NextResponse } from "next/server";
import { assembleShowcase, renderShowcaseHtml } from "@/lib/presenter";

export const dynamic = "force-dynamic";

/**
 * Live preview of The Showcase, rendered from the current draft pool and
 * show registry. Behind admin basic auth (middleware).
 */
export async function GET() {
  const assembled = await assembleShowcase();
  if (!assembled) {
    return new NextResponse(
      `<body style="font-family:sans-serif;padding:40px">Nothing in The Showcase draft yet — no draft items and no active shows in What's happening.</body>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  const html = await renderShowcaseHtml(assembled);
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
