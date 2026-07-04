import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminSessionToken } from "@/lib/admin-session";

/**
 * Cookie-session guard for the admin area (the branded /admin/login page
 * replaced the browser's Basic auth prompt). Cron and public routes are
 * untouched; background "quick" API calls get a JSON 401 so the client
 * can explain instead of silently failing.
 */
export async function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Admin is not configured", { status: 503 });
  }
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && cookie === (await adminSessionToken())) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (request.headers.get("x-quick") === "1") {
      return NextResponse.json(
        {
          ok: false,
          message: "Your session has ended. Refresh the page and log in again.",
        },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url), {
      status: 303,
    });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
