import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminSessionToken,
} from "@/lib/admin-session";
import { messagePageHtml } from "@/lib/message-page";

export const dynamic = "force-dynamic";

/**
 * Branded admin login (deliberately outside the /api/admin matcher so it
 * is reachable while logged out). Right password sets the session cookie
 * for 30 days.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new NextResponse(
      messagePageHtml(
        "Admin is not set up yet",
        "The ADMIN_PASSWORD environment variable is missing, so the admin area is switched off. Add it in the hosting settings and redeploy.",
      ),
      {
        status: 503,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }
  if (password !== expected) {
    return NextResponse.redirect(new URL("/admin/login?error=1", canonicalBase(request.url)), {
      status: 303,
    });
  }
  const response = NextResponse.redirect(new URL("/admin", canonicalBase(request.url)), {
    status: 303,
  });
  response.cookies.set(ADMIN_COOKIE, await adminSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
