import { NextResponse } from "next/server";
import { renderIntroHtml } from "@/lib/send";

export const dynamic = "force-dynamic";

/** Live preview of the introduction email (admin, behind basic auth). */
export async function GET() {
  const html = await renderIntroHtml();
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
