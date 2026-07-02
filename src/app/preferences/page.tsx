import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@/lib/db";
import PuzzleShape from "@/components/PuzzleShape";

export const dynamic = "force-dynamic";

const CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
] as const;

/**
 * Subscriber preferences: change how often the dispatch arrives. Reached
 * from the "change how often" link in every email footer, authenticated
 * by the same per-subscriber token as unsubscribe.
 */
export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; saved?: string }>;
}) {
  const { token, saved } = await searchParams;

  const subscriber = token
    ? (
        await db()
          .select()
          .from(subscribers)
          .where(eq(subscribers.unsubscribeToken, token))
          .limit(1)
      )[0]
    : undefined;

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

        {!subscriber ? (
          <div style={{ position: "relative", zIndex: 1, padding: "14px 0 6px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <PuzzleShape shape="circle" color="pink" size={40} />
              <h1 className="confirm-title">Hmm.</h1>
            </div>
            <p className="confirm-copy">
              That preferences link doesn&#39;t look right. Try the link at
              the bottom of your most recent dispatch, or sign up again.
            </p>
            <Link href="/" className="reset-link" style={{ textDecoration: "none" }}>
              Back to sign-up
            </Link>
          </div>
        ) : (
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 className="popup-title">How often should we visit your inbox?</h1>
            <p className="popup-subtitle">
              Hi {subscriber.firstName} — you&#39;re currently getting the{" "}
              <strong>{subscriber.cadence}</strong> dispatch
              {subscriber.status === "unsubscribed"
                ? ", but you're unsubscribed. Saving a choice below will resubscribe you."
                : "."}
            </p>

            {saved && (
              <p
                style={{
                  background: "var(--cta-mint)",
                  border: "2px solid var(--cta-ink)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Saved — your next {subscriber.cadence} dispatch is on its way.
              </p>
            )}

            <form action="/api/preferences" method="post">
              <input type="hidden" name="token" value={token} />
              <div className="pill-row" style={{ margin: "18px 0 28px" }}>
                {CADENCES.map((c) => (
                  <label key={c.value} className="pill pill-radio">
                    <input
                      type="radio"
                      name="cadence"
                      value={c.value}
                      defaultChecked={subscriber.cadence === c.value}
                      required
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <button type="submit" className="submit">
                Save my preference
              </button>
            </form>

            <p className="disclaimer">
              Want out entirely?{" "}
              <a href={`/unsubscribe?token=${encodeURIComponent(token ?? "")}`}>
                Unsubscribe
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
