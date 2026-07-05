import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { setNotifyEmails } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Admin: save the list of addresses that receive an email whenever
 * someone new subscribes. An empty list turns notifications off.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const raw = String(form.get("emails") ?? "");
  const emails = await setNotifyEmails(raw);

  const message =
    emails.length === 0
      ? "New-subscriber notifications turned off"
      : `New-subscriber notifications will go to ${emails.join(", ")}`;
  return NextResponse.redirect(
    new URL(
      `/admin?tab=settings&message=${encodeURIComponent(message)}`,
      canonicalBase(request.url),
    ),
    { status: 303 },
  );
}
