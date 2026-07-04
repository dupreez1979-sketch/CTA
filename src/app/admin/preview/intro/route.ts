import { NextRequest, NextResponse } from "next/server";
import { renderIntroHtml } from "@/lib/send";

export const dynamic = "force-dynamic";

/**
 * Live preview of the introduction emails (admin, behind the session
 * cookie). ?kind=newsletter shows the newsletter-first variant; anything
 * else shows the Alliance-first original.
 */
export async function GET(request: NextRequest) {
  const kind =
    request.nextUrl.searchParams.get("kind") === "newsletter"
      ? ("newsletter" as const)
      : ("alliance" as const);
  const html = await renderIntroHtml(kind);
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
