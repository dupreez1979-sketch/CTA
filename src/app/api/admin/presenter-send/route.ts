import { NextRequest, NextResponse } from "next/server";
import { sendShowcase } from "@/lib/presenter";

export const dynamic = "force-dynamic";

/**
 * Admin: send The Showcase to the test list now. Included draft items are
 * claimed atomically, so a double-click can't dispatch them twice.
 */
export async function POST(request: NextRequest) {
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(`/admin?tab=presenters&message=${encodeURIComponent(message)}`, request.url),
      { status: 303 },
    );
  try {
    const result = await sendShowcase();
    if (result.status === "skipped")
      return redirect(
        "Nothing to send — the draft is empty (or another send just claimed it)",
      );
    return redirect(
      `The Showcase sent: ${result.itemCount} item${result.itemCount === 1 ? "" : "s"} to ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`,
    );
  } catch (err) {
    return redirect(`Send failed: ${err}`);
  }
}
