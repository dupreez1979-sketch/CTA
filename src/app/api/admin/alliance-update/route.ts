import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { canonicalBase } from "@/lib/canonical";
import { db, allianceUpdates } from "@/lib/db";
import { ensureAllianceSchema } from "@/lib/db-errors";
import {
  getAllianceRecipients,
  sendAllianceUpdate,
  setAllianceRecipients,
} from "@/lib/alliance";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = "force-dynamic";

/**
 * Admin: manage internal Alliance updates — create/save/duplicate/delete a
 * draft, send a test copy, send to the configured group address, and save
 * that group address. All actions bounce back to the Settings tab (the
 * editor sub-view when there's an update in context, otherwise the list).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const base = canonicalBase(request.url);

  const redirect = (message: string, update?: number | null) => {
    const params = new URLSearchParams({ tab: "settings" });
    if (update) params.set("update", String(update));
    params.set("message", message);
    const hash = update ? "" : "#alliance";
    return NextResponse.redirect(
      new URL(`/admin?${params.toString()}${hash}`, base),
      { status: 303 },
    );
  };

  await ensureAllianceSchema();

  if (action === "save-recipients") {
    const emails = await setAllianceRecipients(String(form.get("recipients") ?? ""));
    return redirect(
      emails.length === 0
        ? "No valid address saved; the default group address will be used"
        : `Alliance updates will go to ${emails.join(", ")}`,
    );
  }

  if (action === "create") {
    const [created] = await db()
      .insert(allianceUpdates)
      .values({ status: "draft" })
      .returning({ id: allianceUpdates.id });
    return redirect("New Alliance update draft created", created.id);
  }

  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return redirect("Invalid input");

  const [update] = await db()
    .select()
    .from(allianceUpdates)
    .where(eq(allianceUpdates.id, id))
    .limit(1);
  if (!update) return redirect("That Alliance update no longer exists");

  if (action === "save") {
    if (update.status === "sent")
      return redirect(
        "A sent update can't be edited — Duplicate it to make a new version",
        id,
      );
    await db()
      .update(allianceUpdates)
      .set({
        subject: String(form.get("subject") ?? ""),
        content: String(form.get("content") ?? ""),
        updatedAt: new Date(),
      })
      .where(eq(allianceUpdates.id, id));
    return redirect("Draft saved", id);
  }

  if (action === "duplicate") {
    const [copy] = await db()
      .insert(allianceUpdates)
      .values({
        status: "draft",
        subject: update.subject,
        content: update.content,
      })
      .returning({ id: allianceUpdates.id });
    return redirect("Copied into a new draft", copy.id);
  }

  if (action === "delete") {
    await db().delete(allianceUpdates).where(eq(allianceUpdates.id, id));
    return redirect("Alliance update deleted");
  }

  if (action === "send-test") {
    const to = String(form.get("to") ?? "")
      .split(/[,;\s\n]+/)
      .map((s) => s.trim())
      .filter((s) => EMAIL_RE.test(s));
    if (to.length === 0)
      return redirect("Enter at least one valid email address", id);
    try {
      await sendAllianceUpdate(update, to, { test: true });
    } catch (err) {
      return redirect(`Test send failed: ${err}`, id);
    }
    return redirect(
      `Test sent to ${to.length} address${to.length === 1 ? "" : "es"}. The draft is unchanged`,
      id,
    );
  }

  if (action === "send") {
    const to = await getAllianceRecipients();
    if (to.length === 0)
      return redirect("No group address is set; add one first", id);
    let sentHtml: string;
    try {
      sentHtml = await sendAllianceUpdate(update, to, { test: false });
    } catch (err) {
      return redirect(`Send failed: ${err}`, id);
    }
    // Freeze the exact email so history previews what recipients received.
    await db()
      .update(allianceUpdates)
      .set({
        status: "sent",
        sentAt: new Date(),
        recipients: to.join(", "),
        sentHtml,
      })
      .where(eq(allianceUpdates.id, id));
    return redirect(`Alliance update sent to ${to.join(", ")}`);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
