import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import {
  sendEditionLive,
  sendEditionTest,
  setPresenterRecipients,
} from "@/lib/presenter";
import { showcaseRedirectUrl } from "@/lib/showcase-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = "force-dynamic";

/**
 * Admin: send a Showcase edition. mode=test emails the test list and
 * leaves the draft untouched; mode=live emails every opted-in subscriber
 * and marks the edition sent. The live path claims the edition row
 * atomically, so a double-click can't dispatch it twice.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("edition"));
  const mode = String(form.get("mode") ?? "test");
  const redirect = (message: string, edition: number | null) =>
    NextResponse.redirect(
      showcaseRedirectUrl(canonicalBase(request.url), form, message, { edition }),
      { status: 303 },
    );
  if (!Number.isInteger(id) || id <= 0) return redirect("Invalid input", null);

  try {
    if (mode === "live") {
      const result = await sendEditionLive(id);
      if (result.status === "blocked")
        return redirect(result.reason ?? "Send blocked", id);
      if (result.status === "skipped")
        return redirect(
          "Nothing sent. The Showcase is empty, or it was already sent",
          id,
        );
      return redirect(
        `The Showcase is on its way: ${result.itemCount} stor${result.itemCount === 1 ? "y" : "ies"} to ${result.recipientCount} subscriber${result.recipientCount === 1 ? "" : "s"}`,
        null,
      );
    }

    // The test popup submits the addresses to send to; they become the
    // remembered list (shared with the newsletter test popup) before the
    // send, which reads it back.
    if (form.has("to")) {
      const valid = String(form.get("to") ?? "")
        .split(/[,;\s\n]+/)
        .map((s) => s.trim())
        .filter((s) => EMAIL_RE.test(s));
      if (valid.length === 0)
        return redirect("Enter at least one valid email address", id);
      await setPresenterRecipients(valid.join(", "));
    }
    const result = await sendEditionTest(id);
    if (result.status === "blocked")
      return redirect(result.reason ?? "Send blocked", id);
    if (result.status === "skipped")
      return redirect(
        "Nothing sent. The Showcase is empty; add stories or spotlight shows first",
        id,
      );
    return redirect(
      `Test sent to ${result.recipientCount} address${result.recipientCount === 1 ? "" : "es"}. The draft is unchanged, keep editing or send it live when it is ready`,
      id,
    );
  } catch (err) {
    return redirect(`Send failed: ${err}`, id);
  }
}
