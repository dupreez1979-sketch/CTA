import { eq, sql } from "drizzle-orm";
import { render } from "@react-email/render";
import { Resend } from "resend";
import * as React from "react";
import { db, subscribers, type Subscriber } from "./db";
import { getSetting, setSetting } from "./settings";
import NotifyEmail from "../emails/NotifyEmail";

/**
 * New-subscriber notifications for the Alliance team. Recipient addresses
 * are managed in admin (Subscribers tab) and stored in settings under
 * NOTIFY_KEY; empty means notifications are off. Failures are swallowed —
 * a notification problem must never break a sign-up.
 */

export const NOTIFY_KEY = "notify_emails";

export async function getNotifyEmails(): Promise<string[]> {
  const raw = (await getSetting(NOTIFY_KEY)) ?? "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export async function setNotifyEmails(raw: string): Promise<string[]> {
  const emails = [
    ...new Set(
      raw
        .split(/[,;\s\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
    ),
  ];
  await setSetting(NOTIFY_KEY, emails.join(", "));
  return emails;
}

export async function notifyNewSubscriber(sub: Subscriber): Promise<void> {
  try {
    const to = await getNotifyEmails();
    if (to.length === 0) return;

    const countRows = await db()
      .select({
        cadence: subscribers.cadence,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
      .groupBy(subscribers.cadence);
    const counts = Object.fromEntries(
      countRows.map((c) => [c.cadence, c.count]),
    );

    const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
    const html = await render(
      React.createElement(NotifyEmail, {
        baseUrl,
        firstName: sub.firstName,
        lastName: sub.lastName,
        email: sub.email,
        cadence: sub.cadence,
        counts,
      }),
    );

    if (process.env.SEND_DRY_RUN === "1") {
      console.log(`[dry-run] would notify ${to.join(", ")} of new subscriber`);
      return;
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to,
      subject: `New subscriber: ${sub.firstName} ${sub.lastName} (${sub.cadence})`,
      html,
    });
  } catch (err) {
    console.error("New-subscriber notification failed:", err);
  }
}
