import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * RFC 8058 one-click unsubscribe target for the List-Unsubscribe email
 * header: mail clients POST here without user interaction. GET redirects
 * to the human-facing /unsubscribe page.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token) {
    await db()
      .update(subscribers)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(subscribers.unsubscribeToken, token));
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(
    new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url),
  );
}
