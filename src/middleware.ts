import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { ADMIN_COOKIE, adminSessionToken } from "@/lib/admin-session";
import { messagePageHtml } from "@/lib/message-page";

/**
 * Cookie-session guard for the admin area (the branded /admin/login page
 * replaced the browser's Basic auth prompt). Cron and public routes are
 * untouched; background "quick" API calls get a JSON 401 so the client
 * can explain instead of silently failing.
 */
export async function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
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
  // Netlify sometimes serves a request under its deploy-permalink host
  // (123abc--site.netlify.app). The login cookie lives on the real host
  // only, so staying there looks like being logged out. Bounce straight
  // back to the canonical address, keeping the path and query.
  const appUrl = canonicalBase(request.url);
  try {
    const canonicalHost = new URL(appUrl).host;
    const host = request.nextUrl.host;
    if (host !== canonicalHost && host.endsWith(`--${canonicalHost}`)) {
      const url = new URL(
        request.nextUrl.pathname + request.nextUrl.search,
        appUrl,
      );
      return NextResponse.redirect(url, { status: 308 });
    }
  } catch {
    // APP_URL malformed: skip canonicalisation rather than break admin.
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
    return NextResponse.redirect(new URL("/admin/login", canonicalBase(request.url)), {
      status: 303,
    });
  }
  return NextResponse.redirect(new URL("/admin/login", canonicalBase(request.url)));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
