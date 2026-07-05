import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

/** Log out of admin: clear the session cookie and return to the login page. */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", canonicalBase(request.url)), {
    status: 303,
  });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
