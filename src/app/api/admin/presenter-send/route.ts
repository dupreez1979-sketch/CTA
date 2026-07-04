import { NextRequest, NextResponse } from "next/server";
import { sendEdition } from "@/lib/presenter";
import { showcaseRedirectUrl } from "@/lib/showcase-admin";

export const dynamic = "force-dynamic";

/**
 * Admin: send a Showcase edition to the test list now. The edition row is
 * claimed atomically, so a double-click can't dispatch it twice.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("edition"));
  const redirect = (message: string, edition: number | null) =>
    NextResponse.redirect(
      showcaseRedirectUrl(request.url, form, message, { edition }),
      { status: 303 },
    );
  if (!Number.isInteger(id) || id <= 0) return redirect("Invalid input", null);

  try {
    const result = await sendEdition(id);
    if (result.status === "blocked")
      return redirect(result.reason ?? "Send blocked", id);
    if (result.status === "skipped")
      return redirect(
        "Nothing sent. The Showcase is empty, or it was already sent",
        id,
      );
    return redirect(
      `The Showcase sent: ${result.itemCount} stor${result.itemCount === 1 ? "y" : "ies"} to ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`,
      null,
    );
  } catch (err) {
    return redirect(`Send failed: ${err}`, id);
  }
}
