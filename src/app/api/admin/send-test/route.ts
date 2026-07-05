import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { issueWindow } from "@/lib/cadence";
import { sendTest } from "@/lib/send";
import { setPresenterRecipients } from "@/lib/presenter";
import type { Cadence } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const MAX_TEST_RECIPIENTS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin: send the current issue for a cadence to one or more test
 * addresses (comma separated). Each recipient gets their own footer
 * links when they are a subscriber.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const cadence = String(form.get("cadence") ?? "");
  const recipients = [
    ...new Set(
      String(form.get("to") ?? "")
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => EMAIL_RE.test(s)),
    ),
  ].slice(0, MAX_TEST_RECIPIENTS);
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=editions&message=${encodeURIComponent(message)}`,
        canonicalBase(request.url),
      ),
      { status: 303 },
    );
  if (!["daily", "weekly", "fortnightly"].includes(cadence) || recipients.length === 0) {
    return redirect("Enter at least one valid email address");
  }
  // Remember the addresses: every test popup prefills with the last-used
  // list, shared across the newsletters and The Showcase.
  await setPresenterRecipients(recipients.join(", "));
  try {
    const window = issueWindow(cadence as Cadence, new Date());
    let sent = 0;
    for (const to of recipients) {
      const result = await sendTest(window, to);
      if (result === "no-items") {
        return redirect(`No items in the ${cadence} window, nothing to send`);
      }
      sent++;
    }
    return redirect(
      `Test ${cadence} issue sent to ${sent} address${sent === 1 ? "" : "es"}: ${recipients.join(", ")}`,
    );
  } catch (err) {
    return redirect(`Send failed: ${err}`);
  }
}
