import { render } from "@react-email/render";
import { Resend } from "resend";
import * as React from "react";
import { getSetting, setSetting } from "./settings";
import { parseAllianceContent } from "./alliance-content";
import AllianceUpdateEmail from "../emails/AllianceUpdateEmail";
import type { AllianceUpdate } from "./db";

/**
 * Alliance updates: an internal, hand-composed newsletter sent to a single
 * group address that fans out to the member companies. Kept entirely apart
 * from the public subscriber list. This module owns the recipient setting
 * and the render/send, reusing the branded-email + Resend pattern from
 * notify.ts.
 */

export const ALLIANCE_RECIPIENTS_KEY = "alliance_recipients";

// The Alliance uses one group address for now; used until a real value is
// saved in Settings.
const DEFAULT_RECIPIENTS = ["ketan@monkeybaa.com.au"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalise(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\s\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => EMAIL_RE.test(s)),
    ),
  ];
}

/** The configured group address(es); falls back to the default when unset. */
export async function getAllianceRecipients(): Promise<string[]> {
  const raw = (await getSetting(ALLIANCE_RECIPIENTS_KEY)) ?? "";
  const list = normalise(raw);
  return list.length ? list : DEFAULT_RECIPIENTS;
}

export async function setAllianceRecipients(raw: string): Promise<string[]> {
  const emails = normalise(raw);
  await setSetting(ALLIANCE_RECIPIENTS_KEY, emails.join(", "));
  return emails;
}

export async function renderAllianceUpdate(
  update: Pick<AllianceUpdate, "subject" | "content">,
): Promise<string> {
  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const recipients = await getAllianceRecipients();
  return render(
    React.createElement(AllianceUpdateEmail, {
      baseUrl,
      subject: update.subject,
      blocks: parseAllianceContent(update.content),
      // The group address for the always-on Links section.
      groupEmail: recipients[0] ?? "",
    }),
  );
}

/**
 * Send an update. `test` prefixes the subject with [TEST] and changes
 * nothing else; the caller marks the row sent for a real send.
 */
export async function sendAllianceUpdate(
  update: Pick<AllianceUpdate, "subject" | "content">,
  to: string[],
  opts: { test: boolean },
): Promise<void> {
  const html = await renderAllianceUpdate(update);
  const subject = `${opts.test ? "[TEST] " : ""}${
    update.subject.trim() || "Alliance Update"
  }`;

  if (process.env.SEND_DRY_RUN === "1") {
    console.log(`[dry-run] would send Alliance update to ${to.join(", ")}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "",
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
