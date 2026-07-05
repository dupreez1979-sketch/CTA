import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import {
  addShowToEdition,
  createEditionFromPool,
  deleteEdition,
  duplicateEdition,
  getEdition,
  removeShowFromEdition,
} from "@/lib/presenter";
import { showcaseRedirectUrl } from "@/lib/showcase-admin";

export const dynamic = "force-dynamic";

/**
 * Admin: manage whole Showcase editions — create (pre-filled from unused
 * high-relevance stories + the active show registry), duplicate, delete,
 * and manage an edition's "Shows in the Spotlight" list.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const redirect = (message: string, edition?: number | null) =>
    NextResponse.redirect(
      showcaseRedirectUrl(
        canonicalBase(request.url),
        form,
        message,
        edition === undefined ? undefined : { edition },
      ),
      { status: 303 },
    );

  if (action === "create") {
    const created = await createEditionFromPool();
    return redirect(
      `New Showcase draft created with ${created.itemCount} stor${created.itemCount === 1 ? "y" : "ies"} and ${created.showCount} spotlight show${created.showCount === 1 ? "" : "s"}`,
      created.id,
    );
  }

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return redirect("Invalid input", null);

  if (action === "duplicate") {
    const copyId = await duplicateEdition(id);
    if (!copyId) return redirect("That Showcase no longer exists", null);
    return redirect("Copied into a new draft", copyId);
  }

  if (action === "delete") {
    const deleted = await deleteEdition(id);
    return redirect(
      deleted
        ? "Showcase deleted. Its stories are available to future editions again"
        : "That Showcase no longer exists",
      null,
    );
  }

  if (action === "add-show" || action === "remove-show") {
    const edition = await getEdition(id);
    if (!edition) return redirect("That Showcase no longer exists", null);
    if (edition.status === "sent" || edition.status === "sending")
      return redirect("A sent Showcase can't be changed", id);
    const showId = Number(form.get("showId"));
    if (!Number.isInteger(showId)) return redirect("Invalid input", id);
    if (action === "add-show") {
      await addShowToEdition(id, showId);
      return redirect("Show added to this Showcase", id);
    }
    await removeShowFromEdition(id, showId);
    return redirect("Show removed from this Showcase", id);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
