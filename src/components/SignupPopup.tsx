"use client";

import { useState } from "react";
import PuzzleShape from "./PuzzleShape";

/**
 * The sign-up popup from the design handoff (SignupPopup.dc.html): name/email
 * fields and a "YOU'RE IN!" confirmation. Sign-ups are Showcase only for now —
 * there is no cadence choice and no opt-out; every new subscriber receives The
 * Showcase Edition. `onClose` is optional — the hosted page renders the card
 * without a close button; the iframe embed wires it to a postMessage that
 * dismisses the overlay.
 */
export default function SignupPopup({ onClose }: { onClose?: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          email: data.get("email"),
          // Showcase only for now: no recurring auto cadence.
          cadence: "none",
          showcase: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong — please try again.");
      }
      form.reset();
      setSubmitted(true);
      window.parent?.postMessage?.({ type: "cta-newsletter-subscribed" }, "*");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="popup-card">
      <div className="popup-shape">
        <PuzzleShape shape="plus" color="yellow" size={58} />
      </div>
      {onClose && (
        <button aria-label="Close" className="popup-close" onClick={onClose}>
          ×
        </button>
      )}

      {submitted ? (
        <div style={{ position: "relative", zIndex: 1, padding: "14px 0 6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <PuzzleShape shape="circle" color="teal" size={40} />
            <h2 className="confirm-title">You&#39;re in!</h2>
          </div>
          <p className="confirm-copy">
            Thanks for signing up. The Showcase Edition will land in your inbox
            whenever there is news about shows.
          </p>
          <button className="reset-link" onClick={() => setSubmitted(false)}>
            Sign up another address
          </button>
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="popup-title">Sign up to the Alliance Newsletter</h1>
          <p className="popup-subtitle">
            Get the next Alliance dispatch delivered straight to your inbox.
          </p>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 22,
                marginBottom: 28,
              }}
            >
              <div className="field">
                <label htmlFor="su-first">First name *</label>
                <input id="su-first" name="firstName" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="su-last">Last name *</label>
                <input id="su-last" name="lastName" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="su-email">Email *</label>
                <input id="su-email" name="email" type="email" required />
              </div>
              <div className="field" style={{ gap: 10 }}>
                <p className="signup-note">
                  You&#39;ll receive <strong>The Showcase Edition</strong>: news
                  about shows and tours from the companies of the Alliance, sent
                  as it happens.
                </p>
              </div>
            </div>

            <button type="submit" className="submit" disabled={busy}>
              {busy ? "Signing up…" : "Submit"}
            </button>
            {error && <p className="form-error">{error}</p>}
            <p className="disclaimer">
              By signing up you agree to receive updates from us and accept our{" "}
              <a
                href="https://www.childrenstheatrealliance.com.au/privacy-policy"
                target="_blank"
                rel="noreferrer"
              >
                privacy policy
              </a>
              .
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
