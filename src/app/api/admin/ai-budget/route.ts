import { NextRequest, NextResponse } from "next/server";
import { resetBaseline, setBudget } from "@/lib/ai-spend";

export const dynamic = "force-dynamic";

/** Admin: update the AI credits budget or mark the account as topped up. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=settings&message=${encodeURIComponent(message)}`,
        request.url,
      ),
      { status: 303 },
    );

  if (action === "budget") {
    const usd = Number(form.get("budget"));
    if (!Number.isFinite(usd) || usd <= 0 || usd > 100000) {
      return redirect("Please enter a valid budget amount");
    }
    await setBudget(usd);
    return redirect(`AI credits budget set to $${usd.toFixed(2)} USD`);
  }

  if (action === "reset") {
    await resetBaseline();
    return redirect("Marked as topped up — usage bar reset to zero");
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
