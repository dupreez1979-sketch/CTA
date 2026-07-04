import { NextRequest, NextResponse } from "next/server";
import { sendIntro, type IntroKind } from "@/lib/send";

export const dynamic = "force-dynamic";

/**
 * Admin: send a one-off introduction email (Alliance-first or
 * newsletter-first) to a pasted list of addresses. Recipients are parsed,
 * deduplicated, emailed and then forgotten — nothing is written to the
 * database.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const raw = String(form.get("emails") ?? "");
  const kind: IntroKind =
    String(form.get("kind") ?? "") === "newsletter" ? "newsletter" : "alliance";
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=settings&message=${encodeURIComponent(message)}`,
        request.url,
      ),
      { status: 303 },
    );
  try {
    const result = await sendIntro(raw, kind);
    if (result.sent === 0) {
      return redirect(
        result.invalid.length > 0
          ? `No valid addresses found. Could not read: ${result.invalid.slice(0, 5).join(", ")}`
          : "Please paste at least one email address",
      );
    }
    let message = `Introduction sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}`;
    if (result.invalid.length > 0) {
      message += ` · skipped ${result.invalid.length} invalid: ${result.invalid.slice(0, 5).join(", ")}`;
    }
    if (result.skipped > 0) {
      message += ` · ${result.skipped} over the 200-per-send limit were not sent (send again with the rest)`;
    }
    return redirect(message);
  } catch (err) {
    return redirect(`Intro send failed: ${err}`);
  }
}
