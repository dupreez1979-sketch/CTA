import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic auth for the admin area (username "admin", password from
 * ADMIN_PASSWORD). Cron and public routes are untouched.
 */
export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Admin is not configured", { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`;
  if (auth !== expected) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="CTA Newsletter Admin"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
