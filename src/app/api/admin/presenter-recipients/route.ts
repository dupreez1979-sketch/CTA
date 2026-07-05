import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { setPresenterRecipients } from "@/lib/presenter";

export const dynamic = "force-dynamic";

/**
 * Admin: save The Showcase's test recipient list. While the edition is in
 * test mode this list is the only audience; an empty save falls back to
 * the default test address.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const raw = String(form.get("emails") ?? "");
  const emails = await setPresenterRecipients(raw);
  const message = `The Showcase test list: ${emails.join(", ")}`;
  return NextResponse.redirect(
    new URL(
      `/admin?tab=presenters&message=${encodeURIComponent(message)}`,
      canonicalBase(request.url),
    ),
    { status: 303 },
  );
}
