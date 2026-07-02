import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import PuzzleShape from "@/components/PuzzleShape";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe landing page (linked from every email footer).
 * Visiting with a valid token immediately unsubscribes and shows a
 * branded confirmation.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let outcome: "done" | "invalid" = "invalid";

  if (token) {
    const updated = await db()
      .update(subscribers)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(subscribers.unsubscribeToken, token))
      .returning({ id: subscribers.id });
    if (updated.length > 0) outcome = "done";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 44,
      }}
    >
      <div className="popup-card" style={{ maxWidth: 560 }}>
        <div className="popup-shape">
          <PuzzleShape shape="plus" color="yellow" size={58} />
        </div>
        <div style={{ position: "relative", zIndex: 1, padding: "14px 0 6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <PuzzleShape
              shape="circle"
              color={outcome === "done" ? "teal" : "pink"}
              size={40}
            />
            <h1 className="confirm-title">
              {outcome === "done" ? "You're out." : "Hmm."}
            </h1>
          </div>
          <p className="confirm-copy">
            {outcome === "done"
              ? "You've been unsubscribed from the Alliance newsletter. Changed your mind? You can sign up again any time."
              : "That unsubscribe link doesn't look right. Try the link in your most recent email, or sign up again to manage your subscription."}
          </p>
          <Link href="/" className="reset-link" style={{ textDecoration: "none" }}>
            Back to sign-up
          </Link>
        </div>
      </div>
    </main>
  );
}
