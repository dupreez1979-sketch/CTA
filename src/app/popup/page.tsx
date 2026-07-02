"use client";

import SignupPopup from "@/components/SignupPopup";

/**
 * Bare popup for the iframe embed (served inside the overlay injected by
 * /embed.js on the Wix site). Transparent page background; the dimmed
 * backdrop lives in the parent page. Close is relayed to the parent via
 * postMessage.
 */
export default function PopupPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 32px 46px",
        background: "transparent",
      }}
    >
      <style>{`body { background: transparent; }`}</style>
      <SignupPopup
        onClose={() =>
          window.parent?.postMessage?.({ type: "cta-newsletter-close" }, "*")
        }
      />
    </main>
  );
}
